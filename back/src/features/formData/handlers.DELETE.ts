import type { RouteHandler } from 'fastify';
import { type Types, isObjectIdOrHexString } from 'mongoose';

import type { FormDataDeleteRoute, FormDataPutAndDeleteReply } from './routes';
import {
  combinePrivileges,
  dataPrivilegesQuery,
  getUserData,
  isPrivBlocked,
} from '../../utils/userAndPrivilegeChecks';
import { isCsrfGood } from '../../hooks/csrf';
import DBFormDataModel from '../../dbModels/formData';
import { errors } from '../../core/errors';
import { getApiPathFromReqUrl } from '../../utils/parsingAndConverting';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { getFormData } from './handlers.GET';

// Delete (DELETE)
export const formDataDelete: RouteHandler<FormDataDeleteRoute> = async (req, res) => {
  const url = getApiPathFromReqUrl(req.url);
  const csrfIsGood = isCsrfGood(req);
  const userData = await getUserData(req);
  const returnResponse: FormDataPutAndDeleteReply = { ok: false };

  // Get form
  const form = await DBFormModel.findOne<DBForm>({ url });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find form with url: ${url}`));
  }

  // Check canUseForm privilege
  const privilegeId = `form__${form.simpleId}__canUseForm`;
  const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });
  const canUseFormPrivError = isPrivBlocked(privilege?.privilegeAccess, userData, csrfIsGood);
  if (canUseFormPrivError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not privileged to use form, privilegeId: '${privilegeId}', url: ${url}`
      )
    );
  }

  // Get dataId query param(s) and getData
  const body = req.body;
  const { dataId } = body;
  const dataIdAll = dataId === 'all';

  // Get possible getData before the document(s) is/are deleted
  if (body.getData) {
    let params;
    const dataIds = Array.isArray(dataId) ? dataId : [dataId];
    if (body.getData === true) {
      params = { dataId: dataIds };
    } else {
      params = { ...body.getData, ...(!body.getData.dataId ? { dataId: dataIds } : {}) };
    }
    const getDataResult = await getFormData(params, form, userData, csrfIsGood);
    returnResponse.getData = getDataResult;
  }

  if ((Array.isArray(dataId) && dataId.length > 1) || dataIdAll) {
    // Multiple (M) dataSet deletion
    // *****************************

    // (M) Get old saved formData
    const dataSets = await DBFormDataModel.find({
      $and: [
        { formId: form.simpleId },
        ...(dataIdAll ? [] : [{ _id: { $in: dataId } }]),
        ...dataPrivilegesQuery('delete', userData, csrfIsGood), // @TODO: fix this
      ],
    });
    if (!dataSets?.length) {
      return res.send(
        new errors.NOT_FOUND(
          `Could not find any formData with dataIds: '${dataId.toString()}' (formId: ${
            form.simpleId
          }), url: ${url}`
        )
      );
    }
    if (!dataIdAll && dataSets.length !== dataId.length) {
      return res.send(
        new errors.NOT_FOUND(
          `Could not find some formData with dataIds: '${dataId.toString()}' (formId: ${
            form.simpleId
          }), url: ${url}`
        )
      );
    }

    // (M) Generate dataIdsA array
    const savedDataIds = dataSets.map((doc) => doc._id);

    // (START LOOP)
    for (let i = 0; i < dataSets.length; i++) {
      // (M) Get formData owner
      const formDataOwner =
        isObjectIdOrHexString(dataSets[i].owner) &&
        userData.userId &&
        userData.userId.equals(dataSets[i].owner as Types.ObjectId)
          ? dataSets[i].owner
          : form.owner;

      // (M) Check default and dataSet delete privileges
      const dataSetDeletePrivileges = combinePrivileges(
        form.formDataDefaultPrivileges?.delete || {},
        dataSets[i].privileges?.delete || {}
      );
      const dataSetPrivError = isPrivBlocked(
        dataSetDeletePrivileges,
        userData,
        csrfIsGood,
        formDataOwner
      );
      if (dataSetPrivError) {
        return res.send(
          new errors.UNAUTHORIZED(
            `User not privileged to delete formData in DELETE/delete (mass delete) formData handler, default and/or dataSet privileges (dataSet Id: ${dataSets[
              i
            ]._id.toString()}, url: ${url}, no data was deleted`
          )
        );
      }
    }
    // (END LOOP)

    // (M) Delete multiple dataSets
    const updateResult = await DBFormDataModel.deleteMany({ _id: { $in: savedDataIds } });
    if (updateResult.deletedCount !== savedDataIds.length) {
      returnResponse.error = {
        errorId: 'massDeleteCount',
        message: `Mass delete tried to delete ${savedDataIds.length} dataSets but was able to update ${updateResult.deletedCount} dataSets.`,
      };
    }

    // (M) Success
    returnResponse.ok = true;
    if (!dataIdAll) {
      returnResponse.targetCount = savedDataIds.length;
      returnResponse.deletedCount = updateResult.deletedCount;
    }
    returnResponse.dataId = savedDataIds.map((id) => id.toString());
  } else {
    // Single (S) dataSet delete
    // *************************

    const id = Array.isArray(dataId) ? dataId[0] : dataId;

    // (S) Get old saved formData
    const dataSet = await DBFormDataModel.findOne({
      $and: [{ formId: form.simpleId }, { _id: id }],
    });
    if (!dataSet) {
      return res.send(
        new errors.NOT_FOUND(
          `Could not find formData with dataId: '${id}' (formId: ${form.simpleId}), url: ${url}`
        )
      );
    }

    // (S) Get formData owner
    const formDataOwner =
      isObjectIdOrHexString(dataSet.owner) &&
      userData.userId &&
      userData.userId.equals(dataSet.owner as Types.ObjectId)
        ? dataSet.owner
        : form.owner;

    // (S) Check formData delete privileges
    const formDataEditPrivileges = combinePrivileges(
      form.formDataDefaultPrivileges?.delete || {},
      dataSet.privileges?.delete || {}
    );
    const formDataPrivError = isPrivBlocked(
      formDataEditPrivileges,
      userData,
      csrfIsGood,
      formDataOwner
    );
    if (formDataPrivError) {
      return res.send(
        new errors.UNAUTHORIZED(
          `User not privileged to DELETE/delete formData dataSet (formId: ${form.simpleId}), url: ${url}, id: ${id}`
        )
      );
    }

    // (S) Delete the document from the DB
    const deleteResult = await DBFormDataModel.findOneAndDelete({ _id: id });
    if (!deleteResult) {
      return res.send(
        new errors.DB_GENERAL_ERROR(`Could not delete formData dataSet, url: ${url}, id: ${id}`)
      );
    }

    // (S) Success
    returnResponse.ok = true;
    returnResponse.dataId = dataSet._id.toString();
  }

  return res.send(returnResponse);
};

import type { RouteHandler } from 'fastify';
import { type Types, isObjectIdOrHexString } from 'mongoose';

import type { FormDataDeleteRoute } from './routes';
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

// Delete (DELETE)
export const formDataDelete: RouteHandler<FormDataDeleteRoute> = async (req, res) => {
  const url = getApiPathFromReqUrl(req.url);
  const csrfIsGood = isCsrfGood(req);
  const userData = await getUserData(req);

  // Get form
  const form = await DBFormModel.findOne<DBForm>({ url });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find form with url: ${url}`));
  }

  // Check canUseForm privilege
  const privilegeId = `form__${form.simpleId}__canUseForm`;
  const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });
  const canUseFormPrivError = isPrivBlocked(
    privilege?.privilegeAccess,
    userData,
    csrfIsGood,
    form.owner // @CONSIDER: this might not be good, the owner can bypass this base privilege
  );
  if (canUseFormPrivError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not privileged to use form, privilegeId: '${privilegeId}', url: ${url}`
      )
    );
  }

  // Get dataId query param(s)
  const { dataId } = req.query;
  const dataIdAll = dataId === 'all';

  if ((Array.isArray(dataId) && dataId.length > 1) || dataIdAll) {
    // Multiple (M) dataSet deletion
    // *****************************

    // (M) Get old saved formData
    const dataSets = await DBFormDataModel.find({
      $and: [
        { formId: form.simpleId },
        ...(dataIdAll ? [] : [{ _id: { $in: dataId } }]),
        ...dataPrivilegesQuery('edit', userData, csrfIsGood),
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
    // @TODO: remove this
    savedDataIds;

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
            ]._id.toString()}, url: ${url}`
          )
        );
      }
    }
    // (END LOOP)
  } else {
    // Single (S) dataSet delete
    // *************************

    let id = dataId;
    if (Array.isArray(dataId)) id = dataId[0];

    // (S) Get old saved formData
    const dataSet = await DBFormDataModel.findOne({
      $and: [{ formId: form.simpleId }, { _id: id }],
    });
    if (!dataSet) {
      return res.send(
        new errors.NOT_FOUND(
          `Could not find formData with dataId: '${id as string}' (formId: ${
            form.simpleId
          }), url: ${url}`
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
          `User not privileged to DELETE/delete formData dataSet (formId: ${form.simpleId}), url: ${url}`
        )
      );
    }
  }

  return res.send({ ok: true });
};

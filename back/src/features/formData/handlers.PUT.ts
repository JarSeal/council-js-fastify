import type { RouteHandler } from 'fastify';
import { type Types, isObjectIdOrHexString } from 'mongoose';

import type { FormDataPutAndDeleteReply, FormDataPutRoute } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import getFormDataModel from '../../dbModels/formData/';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import {
  getUserData,
  isPrivBlocked,
  combinePrivileges,
  dataPrivilegesQuery,
  combineBasicPrivileges,
} from '../../utils/userAndPrivilegeChecks';
import {
  createNewEditedArray,
  getApiPathFromReqUrl,
  getOwnerChangingObject,
} from '../../utils/parsingAndConverting';
import { validateFormDataInput } from '../../utils/validation';
import { getFormData } from './handlers.GET';
import { afterFns } from '../../customFunctions/afterFn';
import { getRequiredActions } from '../../utils/requiredLoginChecks';
import { encryptData } from '../../core/config';

// Edit (PUT)
export const formDataPut: RouteHandler<FormDataPutRoute> = async (req, res) => {
  const body = req.body;
  const url = getApiPathFromReqUrl(req.url);
  const DBFormDataModel = getFormDataModel(url);

  const csrfIsGood = isCsrfGood(req);
  const userData = await getUserData(req);

  // Check required actions
  const requiredActions = await getRequiredActions(req, userData);
  if (requiredActions !== null) {
    return res.send(
      new errors.REQUIRED_ACTIONS_ERR(
        `required actions: ${JSON.stringify(requiredActions)}, formData PUT url "${req.url}"`
      )
    );
  }

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

  const formElems = form.form.formElems;
  const formData = body.formData;
  const dataId = body.dataId;
  const dataIdAll = dataId === 'all';
  const returnResponse: FormDataPutAndDeleteReply = { ok: false };

  if ((Array.isArray(dataId) && dataId.length > 1) || dataIdAll) {
    // Multiple (M) dataSet edit
    // *************************

    // (M) Get old saved formData
    const dataSets = await DBFormDataModel.find({
      $and: [
        { formId: form.simpleId },
        ...(dataIdAll ? [] : [{ _id: { $in: dataId } }]),
        ...dataPrivilegesQuery(userData, csrfIsGood, 'edit'),
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

    // (M) Validate formData values against form elems
    const validatorError = validateFormDataInput(formElems, formData);
    if (validatorError) {
      return res.status(400).send({ ok: false, error: validatorError });
    }

    // (M) Generate dataIdsA array
    const savedDataIds = dataSets.map((doc) => doc._id);

    // (START LOOP)
    let newOwnerObject = {};
    const bulkWrite = [];
    for (let i = 0; i < dataSets.length; i++) {
      // (M) Get formData owner
      const formDataOwner =
        isObjectIdOrHexString(dataSets[i].owner) &&
        userData.userId &&
        userData.userId.equals(dataSets[i].owner as Types.ObjectId)
          ? dataSets[i].owner
          : form.owner;

      // (M) Check default and dataSet privileges
      const dataSetEditPrivileges = combinePrivileges(
        form.formDataDefaultPrivileges?.edit || {},
        dataSets[i].privileges?.edit || {}
      );
      const dataSetPrivError = isPrivBlocked(
        dataSetEditPrivileges,
        userData,
        csrfIsGood,
        formDataOwner
      );
      if (dataSetPrivError) {
        return res.send(
          new errors.UNAUTHORIZED(
            `User not privileged to edit formData in PUT/edit (mass edit) formData handler, default and/or dataSet privileges (dataSet Id: ${dataSets[
              i
            ]._id.toString()}, url: ${url}, ids: ${dataId.toString()}`
          )
        );
      }

      // (M) Check elem privileges
      for (let j = 0; j < formData.length; j++) {
        const elem = formElems.find((formElem) => formElem.elemId === formData[j].elemId);
        if (!elem || elem.doNotSave) continue;
        const savedDBElem = dataSets[i].data.find((dbElem) => dbElem.elemId === formData[j].elemId);
        if (savedDBElem && elem.privileges?.edit) {
          const elemDataEditPrivileges = combinePrivileges(
            elem.privileges?.edit || {},
            savedDBElem.privileges?.edit || {}
          );
          const elemFormDataPrivError = isPrivBlocked(
            elemDataEditPrivileges,
            userData,
            csrfIsGood,
            formDataOwner
          );
          if (elemFormDataPrivError) {
            return res.send(
              new errors.UNAUTHORIZED(
                `User not privileged to edit formData in PUT/edit (mass edit) formData handler, elem privileges (dataSet Id: ${dataSets[
                  i
                ]._id.toString()}, elemId: ${elem.elemId}), url: ${url}, ids: ${dataId.toString()}`
              )
            );
          }
        }
      }

      // (M) Check owner change possibility
      if (body.owner) {
        newOwnerObject = getOwnerChangingObject(dataSets[i].owner, userData, body.owner);
        if (!Object.keys(newOwnerObject).length) {
          newOwnerObject = getOwnerChangingObject(form.owner, userData, body.owner);
        }
        if (!Object.keys(newOwnerObject).length) {
          return res.send(
            new errors.UNAUTHORIZED(
              `User cannot change owners for some or all of the datasets in PUT/edit formData handler (mass edit), url: ${url}, ids: ${dataId.toString()}`
            )
          );
        }
      }

      // (M) Check if any privileges are passed and if the user has privileges to set them (canEditPrivileges)
      if (body.privileges || body.canEditPrivileges || formData.find((fd) => fd.privileges)) {
        const formCanEditPrivilegesError = isPrivBlocked(
          // @TODO: change to user combineBasicPrivileges
          combinePrivileges(
            { ...form.canEditPrivileges, public: 'false', requireCsrfHeader: false },
            {
              ...(dataSets[i].canEditPrivileges
                ? { ...dataSets[i].canEditPrivileges, public: 'false', requireCsrfHeader: false }
                : {}),
            }
          ),
          userData,
          true,
          formDataOwner
        );
        if (formCanEditPrivilegesError) {
          return res.send(
            new errors.UNAUTHORIZED(
              `User not privileged to set privileges in PUT/edit formData handler (mass edit), canEditPrivileges, url: ${url}, ids: ${dataId.toString()}`
            )
          );
        }
      }

      // (M) Create formData.data
      const updatedData = [];
      let hasElemPrivileges = false;
      for (let j = 0; j < formElems.length; j++) {
        const newElem = formData.find((elem) => elem.elemId === formElems[j].elemId);
        const oldElem = dataSets[i].data.find((elem) => elem.elemId === formElems[j].elemId);
        let privileges;
        if (newElem?.privileges) {
          privileges = {
            ...(newElem.privileges.read && Object.keys(newElem.privileges.read).length
              ? { read: newElem.privileges.read }
              : oldElem?.privileges?.read && Object.keys(oldElem.privileges.read).length
              ? { read: oldElem.privileges.read }
              : {}),
            ...(newElem.privileges.edit && Object.keys(newElem.privileges.edit).length
              ? { edit: newElem.privileges.edit }
              : oldElem?.privileges?.edit && Object.keys(oldElem.privileges.edit).length
              ? { edit: oldElem.privileges.edit }
              : {}),
          };
        } else if (oldElem?.privileges) {
          privileges = oldElem.privileges;
        }
        if (newElem) {
          if (formElems[j].elemType === 'inputSecret') {
            newElem.value = encryptData(String(newElem.value));
          }
          updatedData.push({ ...newElem, ...(privileges ? { privileges } : {}) });
          if (newElem.privileges) hasElemPrivileges = true;
          continue;
        }
        if (oldElem) {
          updatedData.push(oldElem);
          if (oldElem.privileges) hasElemPrivileges = true;
        }
      }

      // (M) Push to bulkWrite array
      const privileges = {
        ...(body.privileges?.read
          ? { read: body.privileges.read }
          : dataSets[i].privileges?.read
          ? { read: dataSets[i].privileges?.read }
          : {}),
        ...(body.privileges?.edit
          ? { edit: body.privileges.edit }
          : dataSets[i].privileges?.edit
          ? { edit: dataSets[i].privileges?.edit }
          : {}),
        ...(body.privileges?.delete
          ? { delete: body.privileges.delete }
          : dataSets[i].privileges?.delete
          ? { delete: dataSets[i].privileges?.delete }
          : {}),
      };
      bulkWrite.push({
        updateOne: {
          filter: { _id: dataSets[i]._id },
          update: {
            $set: {
              edited: await createNewEditedArray(
                dataSets[i].edited,
                userData?.userId,
                dataSets[i].editedHistoryCount
              ),
              ...newOwnerObject,
              hasElemPrivileges,
              data: updatedData,
              ...(Object.keys(privileges).length ? { privileges: privileges } : {}),
              ...(body.canEditPrivileges ? { canEditPrivileges: body.canEditPrivileges } : {}),
            },
          },
        },
      });
    }
    // (END LOOP)

    // (M) BulkWrite the data
    const updateResult = await DBFormDataModel.collection.bulkWrite(bulkWrite);
    if (updateResult.modifiedCount !== savedDataIds.length) {
      returnResponse.error = {
        errorId: 'massEditUpdateCount',
        status: 200,
        message: `Mass edit tried to modify ${savedDataIds.length} dataSets but was able to update ${updateResult.modifiedCount} dataSets.`,
      };
    }

    // (M) Success
    returnResponse.ok = true;
    if (!dataIdAll) {
      returnResponse.targetCount = savedDataIds.length;
      returnResponse.modifiedCount = updateResult.modifiedCount;
    }
    returnResponse.dataId = savedDataIds.map((id) => id.toString());
  } else {
    // Single (S) dataSet edit
    // ***********************

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

    // (S) Check formData edit privileges
    const formDataEditPrivileges = combinePrivileges(
      form.formDataDefaultPrivileges?.edit || {},
      dataSet.privileges?.edit || {}
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
          `User not privileged to PUT/edit formData dataSet (formId: ${
            form.simpleId
          }), url: ${url}, id: ${id.toString()}`
        )
      );
    }

    // (S) Check elem privileges
    for (let i = 0; i < formData.length; i++) {
      const elem = formElems.find((formElem) => formElem.elemId === formData[i].elemId);
      if (!elem || elem.doNotSave) continue;
      const savedDBElem = dataSet.data.find((dbElem) => dbElem.elemId === formData[i].elemId);
      if (savedDBElem && elem.privileges?.edit) {
        const elemDataEditPrivileges = combinePrivileges(
          formDataEditPrivileges,
          elem.privileges?.edit || {},
          savedDBElem.privileges?.edit || {}
        );
        const elemFormDataPrivError = isPrivBlocked(
          elemDataEditPrivileges,
          userData,
          csrfIsGood,
          formDataOwner
        );
        if (elemFormDataPrivError) {
          return res.send(
            new errors.UNAUTHORIZED(
              `User not privileged to edit formData in PUT/edit formData handler, elem privileges (elemId: ${
                elem.elemId
              }), url: ${url}, id: ${id.toString()}`
            )
          );
        }
      }
    }

    // (S) Validate formData values against form elems
    const validatorError = validateFormDataInput(formElems, formData);
    if (validatorError) {
      return res.status(400).send({ ok: false, error: validatorError });
    }

    // (S) Check if any privileges are passed and if the user has privileges to set them (canEditPrivileges)
    if (body.privileges || body.canEditPrivileges || body.formData.find((fd) => fd.privileges)) {
      const formCanEditPrivilegesError = isPrivBlocked(
        combineBasicPrivileges(form.canEditPrivileges || {}, dataSet.canEditPrivileges || {}),
        userData,
        true,
        formDataOwner
      );
      if (formCanEditPrivilegesError) {
        return res.send(
          new errors.UNAUTHORIZED(
            `User not privileged to set privileges in PUT/edit formData handler, canEditPrivileges, url: ${url}, id: ${id.toString()}`
          )
        );
      }
    }

    // (S) Create formData.data
    const updatedData = [];
    let hasElemPrivileges = false;
    for (let i = 0; i < formElems.length; i++) {
      const newElem = formData.find((elem) => elem.elemId === formElems[i].elemId);
      const oldElem = dataSet.data.find((elem) => elem.elemId === formElems[i].elemId);
      let privileges;
      if (newElem?.privileges) {
        privileges = {
          ...(newElem.privileges.read && Object.keys(newElem.privileges.read).length
            ? { read: newElem.privileges.read }
            : oldElem?.privileges?.read && Object.keys(oldElem.privileges.read).length
            ? { read: oldElem.privileges.read }
            : {}),
          ...(newElem.privileges.edit && Object.keys(newElem.privileges.edit).length
            ? { edit: newElem.privileges.edit }
            : oldElem?.privileges?.edit && Object.keys(oldElem.privileges.edit).length
            ? { edit: oldElem.privileges.edit }
            : {}),
        };
      } else if (oldElem?.privileges) {
        privileges = oldElem.privileges;
      }
      if (newElem) {
        updatedData.push({ ...newElem, ...(privileges ? { privileges } : {}) });
        if (newElem.privileges) hasElemPrivileges = true;
        continue;
      }
      if (oldElem) {
        updatedData.push(oldElem);
        if (oldElem.privileges) hasElemPrivileges = true;
      }
    }

    // (S) Check and prepare owner change
    let ownerChangingObject = {};
    if (body.owner) {
      ownerChangingObject = getOwnerChangingObject(dataSet.owner, userData, body.owner);
      if (!Object.keys(ownerChangingObject).length) {
        ownerChangingObject = getOwnerChangingObject(form.owner, userData, body.owner);
      }
      if (!Object.keys(ownerChangingObject).length) {
        return res.send(
          new errors.UNAUTHORIZED(
            `User cannot change the owner in PUT/edit formData handler, url: ${url}, id: ${id.toString()}`
          )
        );
      }
    }

    // (S) Save formData dataSet
    const privileges = {
      ...(body.privileges?.read
        ? { read: body.privileges.read }
        : dataSet.privileges?.read
        ? { read: dataSet.privileges.read }
        : {}),
      ...(body.privileges?.edit
        ? { edit: body.privileges.edit }
        : dataSet.privileges?.edit
        ? { edit: dataSet.privileges.edit }
        : {}),
      ...(body.privileges?.delete
        ? { delete: body.privileges.delete }
        : dataSet.privileges?.delete
        ? { delete: dataSet.privileges.delete }
        : {}),
    };
    const updateResult = await DBFormDataModel.updateOne(
      { _id: dataSet._id },
      {
        $set: {
          edited: await createNewEditedArray(
            dataSet.edited,
            userData?.userId,
            dataSet.editedHistoryCount
          ),
          ...ownerChangingObject,
          hasElemPrivileges,
          data: updatedData,
          ...(Object.keys(privileges).length ? { privileges: privileges } : {}),
          ...(body.canEditPrivileges ? { canEditPrivileges: body.canEditPrivileges } : {}),
        },
      }
    );
    if (updateResult.modifiedCount !== 1) {
      return res.send(
        new errors.DB_GENERAL_ERROR(
          `Could not update formData dataSet, url: ${url}, id: ${id.toString()}`
        )
      );
    }

    // (S) Success
    returnResponse.ok = true;
    returnResponse.dataId = dataSet._id.toString();
  }

  if (body.getData) {
    let params;
    const dataIds = Array.isArray(dataId) ? dataId : [dataId];
    if (body.getData === true) {
      params = { dataId: dataIds };
    } else {
      params = { ...body.getData, ...(!body.getData.dataId ? { dataId: dataIds } : {}) };
    }
    const getDataResult = await getFormData(params, form, userData, csrfIsGood, req);
    returnResponse.getData = getDataResult;
  }

  if (form.afterEditFn?.length) {
    for (let i = 0; i < form.afterEditFn.length; i++) {
      const afterFn = afterFns[form.afterEditFn[i]];
      if (afterFn) {
        const result = await afterFn.afterFn({ req, dataId, userData, form });
        if (!result.ok) {
          return res.send(result.error || new errors.AFTER_FN_ERR("Form's afterEditFn error"));
        }
      }
    }
  }

  return res.send(returnResponse);
};

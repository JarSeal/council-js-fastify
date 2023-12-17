import type { RouteHandler } from 'fastify';
import { type Types, isObjectIdOrHexString } from 'mongoose';

import type { FormDataPutReply, FormDataPutRoute } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel from '../../dbModels/formData';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import {
  getUserData,
  isPrivBlocked,
  combinePrivileges,
  dataPrivilegesQuery,
} from '../../utils/userAndPrivilegeChecks';
import { getApiPathFromReqUrl } from '../../utils/parsingAndConverting';
import { validateFormDataInput } from '../../utils/validation';

// Edit (PUT)
export const formDataPut: RouteHandler<FormDataPutRoute> = async (req, res) => {
  const body = req.body;
  const url = getApiPathFromReqUrl(req.url);

  const csrfIsGood = isCsrfGood(req);
  const userData = await getUserData(req);

  // Get form
  const form = await DBFormModel.findOne<DBForm>({ url });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find form with url: ${url}`));
  }

  // Get canUseForm privilege
  const privilegeId = `form__${form.simpleId}__canUseForm`;
  const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });

  // Check form's formDataDefaultPrivileges (edit)
  const formDataDefaultEditPrivileges = combinePrivileges(
    privilege?.privilegeAccess || {},
    form.formDataDefaultPrivileges?.edit || {}
  );
  const editFormDataPrivError = isPrivBlocked(
    formDataDefaultEditPrivileges,
    userData,
    csrfIsGood,
    form.owner
  );
  if (editFormDataPrivError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not privileged to edit formData in PUT/edit formData handler, formDataDefaultPrivileges, url: ${url}`
      )
    );
  }

  const formElems = form.form.formElems;
  const formData = body.formData;
  const dataId = body.dataId;

  if ((Array.isArray(dataId) && dataId.length > 1) || dataId == 'all') {
    // Multiple (M) dataSet edit
    // TODO: get data with multiple dataIds (could be "all")
    return res.send({
      ok: false,
      error: { errorId: 'notImplemented', message: 'Not implemented.' },
    });
  } else {
    // Single (S) dataSet edit
    let id = dataId;
    if (Array.isArray(dataId)) id = dataId[0];

    // (S) Get old saved formData
    const dataSet = await DBFormDataModel.findOne({
      $and: [
        { formId: form.simpleId },
        { _id: id },
        ...dataPrivilegesQuery('edit', userData, csrfIsGood),
      ],
    });
    if (!dataSet) {
      return res.send(
        new errors.UNAUTHORIZED(
          `Could not get old saved formData set to PUT/edit, either because lacking privileges or data set does not exist (formId: ${form.simpleId}), url: ${url}`
        )
      );
    }

    const formDataOwner =
      isObjectIdOrHexString(dataSet.owner) &&
      userData.userId &&
      userData.userId.equals(dataSet.owner as Types.ObjectId)
        ? dataSet.owner
        : form.owner;

    // (S) Check elem privileges
    for (let i = 0; i < formData.length; i++) {
      const elem = formElems.find((formElem) => formElem.elemId === formData[i].elemId);
      if (!elem || elem.doNotSave) continue;
      const savedDBElem = dataSet.data.find((dbElem) => dbElem.elemId === formData[i].elemId);
      if (savedDBElem && elem.privileges?.edit) {
        const elemDataEditPrivileges = combinePrivileges(
          formDataDefaultEditPrivileges,
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
              `User not privileged to edit formData in PUT/edit formData handler, elem privileges (elemId: ${elem.elemId}), url: ${url}`
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
        combinePrivileges(
          { ...form.canEditPrivileges, public: 'false', requireCsrfHeader: false },
          {
            ...(dataSet.canEditPrivileges
              ? { ...dataSet.canEditPrivileges, public: 'false', requireCsrfHeader: false }
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
            `User not privileged to set privileges in PUT/edit formData handler, canEditPrivileges, url: ${url}`
          )
        );
      }
    }

    // (S) Create formData.data
    const updatedData = [];
    let hasElemPrivileges = false;
    for (let i = 0; i < formElems.length; i++) {
      const newElem = formData.find((elem) => elem.elemId === formElems[i].elemId);
      if (newElem) {
        updatedData.push(newElem);
        if (newElem.privileges) hasElemPrivileges = true;
        continue;
      }
      const oldElem = dataSet.data.find((elem) => elem.elemId === formElems[i].elemId);
      if (oldElem) {
        updatedData.push(oldElem);
        if (oldElem.privileges) hasElemPrivileges = true;
      }
    }

    // (S) Create updated formData dataSet
    const updatedDataSet = {
      edited: [], // @TODO: add edited updater
      // @TODO: add owner changing possibility
      hasElemPrivileges,
      ...(body.privileges ? { privileges: body.privileges } : {}),
      data: updatedData,
    };

    updatedDataSet;
    // const updatedDoc =
    const returnResponse: FormDataPutReply = { ok: true };
    return res.send(returnResponse);
  }

  // if (body.getData) {
  //   let params;
  //   if (body.getData === true) {
  //     params = { dataId: [newDataId] };
  //   } else {
  //     params = { ...body.getData, ...(!body.getData.dataId ? { dataId: [newDataId] } : {}) };
  //   }
  //   const getDataResult = await getFormData(params, form, userData, csrfIsGood);
  //   returnResponse.getData = getDataResult;
  // }

  return res.send({ ok: false });
};

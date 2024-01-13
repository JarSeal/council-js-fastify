import type { FastifyRequest, RouteHandler } from 'fastify';

import type { FormDataPostBody, FormDataPostReply, FormDataPostRoute } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import { type DBFormData } from '../../dbModels/formData';
import getFormDataModel from '../../dbModels/formData/';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import {
  getUserData,
  isPrivBlocked,
  combinePrivileges,
  type UserData,
} from '../../utils/userAndPrivilegeChecks';
import {
  addPossibleFillerToElemPrivs,
  addPossibleFillerToMainPrivs,
  convertFormDataPrivilegesForSave,
  convertPrivilegeIdStringsToObjectIds,
  getApiPathFromReqUrl,
  getOwnerChangingObject,
} from '../../utils/parsingAndConverting';
import { validateFormDataInput } from '../../utils/validation';
import { getFormData } from './handlers.GET';
import { afterFns } from '../../customFunctions/afterFn';

// Create (POST)
export const formDataPost: RouteHandler<FormDataPostRoute> = async (req, res) => {
  const body = req.body;
  const url = getApiPathFromReqUrl(req.url);

  const csrfIsGood = isCsrfGood(req);
  const userData = await getUserData(req);

  // Get form
  const form = await DBFormModel.findOne<DBForm>({ url });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find form with url: ${url}`));
  }

  const response = await postFormData(body, form, userData, csrfIsGood, req);
  if ('error' in response && response.error?.status) {
    return res.status(response.error.status).send(response);
  }
  return res.send(response);
};

export const postFormData = async (
  body: FormDataPostBody,
  form: DBForm,
  userData: UserData,
  csrfIsGood: boolean,
  req: FastifyRequest
) => {
  const DBFormDataModel = getFormDataModel(form.url);

  // Check canUseForm privilege and formDataDefaultPrivileges (create)
  const privilegeId = `form__${form.simpleId}__canUseForm`;
  const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });
  let createFormDataPrivError = isPrivBlocked(privilege?.privilegeAccess, userData, csrfIsGood);
  if (createFormDataPrivError) {
    return new errors.UNAUTHORIZED(
      `User not privileged to create formData in POST/create formData handler, privilegeId: '${privilegeId}', url: ${form.url}`
    );
  }
  const formDataDefaultCreatePrivs = form.formDataDefaultPrivileges?.create;
  createFormDataPrivError = isPrivBlocked(
    formDataDefaultCreatePrivs,
    userData,
    csrfIsGood,
    form.owner
  );
  if (createFormDataPrivError) {
    return new errors.UNAUTHORIZED(
      `User not privileged to create formData in POST/create formData handler, formDataDefaultPrivileges.create, url: ${form.url}`
    );
  }

  // Check if any privileges are passed and if the user has privileges to set them (canEditPrivileges)
  if (body.privileges || body.canEditPrivileges || body.formData.find((fd) => fd.privileges)) {
    const formCanEditPrivilegesError = isPrivBlocked(
      { ...form.canEditPrivileges, public: 'false', requireCsrfHeader: false },
      userData,
      true,
      form.owner
    );
    if (formCanEditPrivilegesError) {
      return new errors.UNAUTHORIZED(
        `User not privileged to set privileges in POST/create formData handler, canEditPrivileges, url: ${form.url}`
      );
    }
  }

  const formElems = form.form.formElems;
  const formData = body.formData;

  // Check maxDataCreatorDocs
  if (form.maxDataCreatorDocs && userData.isSignedIn) {
    const count = await DBFormDataModel.countDocuments({
      $and: [{ formId: form.simpleId }, { 'created.user': userData.userId }],
    });
    if (count >= form.maxDataCreatorDocs) {
      const message = `Max formData documents per creator reached, formId: ${form.simpleId}`;
      return {
        ok: false,
        error: { errorId: 'maxDataCreatorDocs', status: 403, message },
      };
    }
  }

  // Check form elems' privileges (create) for the sent elems
  for (let i = 0; i < formData.length; i++) {
    const elem = formElems.find((elem) => elem.elemId === formData[i].elemId);
    if (!elem || elem.doNotSave) continue;
    if (elem.privileges?.create) {
      const elemDataCreatePrivileges = combinePrivileges(
        formDataDefaultCreatePrivs || {},
        elem.privileges?.create || {}
      );
      const elemFormDataPrivError = isPrivBlocked(
        elemDataCreatePrivileges,
        userData,
        csrfIsGood,
        form.owner
      );
      if (elemFormDataPrivError) {
        return new errors.UNAUTHORIZED(
          `User not privileged to create formData in POST/create formData handler, elem privileges (elemId: ${elem.elemId}), url: ${form.url}`
        );
      }
    }
  }

  // Check and prepare owner change
  let ownerChangingObject = {};
  if (body.owner) {
    ownerChangingObject = getOwnerChangingObject(form.owner, userData, body.owner);
    if (!Object.keys(ownerChangingObject).length) {
      return new errors.UNAUTHORIZED(
        `User cannot add the owner in POST/create formData handler, url: ${form.url}`
      );
    }
  }

  // Validate formData values against form elems
  const validatorError = validateFormDataInput(formElems, formData);
  if (validatorError) {
    return { ok: false, error: validatorError };
  }

  // Create formData.data
  const saveData = [];
  let hasElemPrivileges = false;
  for (let i = 0; i < formData.length; i++) {
    const elem = formElems.find((elem) => elem.elemId === formData[i].elemId);
    if (!elem || elem.doNotSave) continue;
    let elemPrivs = convertFormDataPrivilegesForSave(formData[i].privileges);
    elemPrivs = addPossibleFillerToElemPrivs(
      form.addFillerToPrivileges || [],
      elemPrivs,
      userData,
      elem.elemId
    );
    saveData.push({
      elemId: elem.elemId,
      value: formData[i].value,
      ...(elemPrivs ? { privileges: elemPrivs } : {}),
    });
    if (formData[i].privileges || elem.privileges) hasElemPrivileges = true;
  }

  if (!saveData.length) {
    return {
      ok: false,
      error: {
        errorId: 'createFormDataEmpty',
        status: 400,
        message:
          'Form data had no data to save, either because of lacking privileges or no saveable data was sent.',
      },
    };
  }

  // Convert privileges and canEditPrivileges to ObjectIds
  let mainPrivs = {
    ...(form.formDataDefaultPrivileges || {}),
    ...convertFormDataPrivilegesForSave(body.privileges),
  };
  mainPrivs = addPossibleFillerToMainPrivs(form.addFillerToPrivileges || [], mainPrivs, userData);
  const canEditPrivs = convertPrivilegeIdStringsToObjectIds(body.canEditPrivileges);

  // Owner
  let formDataOwner = null;
  if (body.owner) {
    const ownerObj = getOwnerChangingObject(form.owner, userData, body.owner);
    if (Object.keys(ownerObj).length) {
      formDataOwner = ownerObj.owner;
    }
  }
  if (!formDataOwner) {
    formDataOwner = form.fillerIsFormDataOwner
      ? userData.userId || form.formDataOwner || null
      : form.formDataOwner || null;
  }

  // Create formData object and save
  const newFormData = new DBFormDataModel<DBFormData>({
    formId: form.simpleId,
    url: form.url,
    created: {
      user: userData.userId || null,
      date: new Date(),
    },
    edited: [],
    owner: formDataOwner,
    hasElemPrivileges,
    data: saveData,
    ...(mainPrivs ? { privileges: mainPrivs } : {}),
    ...(canEditPrivs ? { canEditPrivileges: canEditPrivs } : {}),
  });
  const savedFormData = await newFormData.save();
  if (!savedFormData) {
    return new errors.DB_GENERAL_ERROR(
      `could not create/POST new formData for formId: '${form.simpleId}', url: ${form.url}`
    );
  }

  const newDataId = savedFormData._id.toString();
  const returnResponse: FormDataPostReply = { ok: true, dataId: newDataId };

  if (body.getData) {
    let params;
    if (body.getData === true) {
      params = { dataId: [newDataId] };
    } else {
      params = { ...body.getData, ...(!body.getData.dataId ? { dataId: [newDataId] } : {}) };
    }
    const getDataResult = await getFormData(params, form, userData, csrfIsGood, req);
    returnResponse.getData = getDataResult;
  }

  if (form.afterCreateFn?.length) {
    for (let i = 0; i < form.afterCreateFn.length; i++) {
      const afterFn = afterFns[form.afterCreateFn[i]];
      if (afterFn) {
        afterFn.afterFn(newDataId, form, userData, req);
      }
    }
  }

  return returnResponse;
};

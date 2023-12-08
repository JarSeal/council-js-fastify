import type { RouteHandler } from 'fastify';

import type { FormDataPutReply, FormDataPutRoute } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel, { type DBFormData } from '../../dbModels/formData';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { errors } from '../../core/errors';
import { isCsrfGood } from '../../hooks/csrf';
import { getUserData, isPrivBlocked, combinePrivileges } from '../../utils/userAndPrivilegeChecks';
import { getApiPathFromReqUrl } from '../../utils/parsingAndConverting';
import { validateFormDataInput } from '../../utils/validation';
import { getFormData } from './handlers.GET';

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

  // Get canUseForm privilege (this is also checked when getting the form)
  const privilegeId = `form__${form.simpleId}__canUseForm`;
  const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });

  // Check form's formDataDefaultPrivileges (edit)
  const formDataDefaultEditPrivileges = combinePrivileges(
    privilege?.privilegeAccess || {},
    form.formDataDefaultPrivileges?.edit || {}
  );
  const editFormDataPrivError = isPrivBlocked(formDataDefaultEditPrivileges, userData, csrfIsGood);
  if (editFormDataPrivError) {
    return res.send(
      new errors.UNAUTHORIZED(
        `User not privileged to edit formData in PUT/edit formData handler, formDataDefaultPrivileges, url: ${url}`
      )
    );
  }

  const formElems = form.form.formElems;
  // After this, refactor to put
  const formData = body.formData;

  // Check form elems' privileges (edit) for the sent elems
  for (let i = 0; i < formData.length; i++) {
    const elem = formElems.find((elem) => elem.elemId === formData[i].elemId);
    if (!elem || elem.doNotSave) continue;
    if (elem.privileges?.edit) {
      const elemDataEditPrivileges = combinePrivileges(
        formDataDefaultEditPrivileges,
        elem.privileges.edit || {}
      );
      const elemFormDataPrivError = isPrivBlocked(elemDataEditPrivileges, userData, csrfIsGood);
      if (elemFormDataPrivError) {
        return res.send(
          new errors.UNAUTHORIZED(
            `User not privileged to edit formData in PUT/edit formData handler, elem privileges (elemId: ${elem.elemId}), url: ${url}`
          )
        );
      }
    }
  }

  // Validate formData values against form elems
  const validatorError = validateFormDataInput(formElems, formData);
  if (validatorError) {
    return res.status(400).send({ ok: false, error: validatorError });
  }

  // Create formData.data
  const saveData = [];
  let hasElemPrivileges = false;
  for (let i = 0; i < formData.length; i++) {
    const elem = formElems.find((elem) => elem.elemId === formData[i].elemId);
    if (!elem || elem.doNotSave) continue;
    saveData.push({
      elemId: elem.elemId,
      value: formData[i].value,
      ...(elem.privileges ? { privileges: elem.privileges } : {}),
    });
    if (elem.privileges) hasElemPrivileges = true;
  }

  if (!saveData.length) {
    return res.status(400).send({
      ok: false,
      error: {
        errorId: 'saveDataEmpty',
        message:
          'Form data had no data to save, either because of lacking privileges or no saveable data was sent.',
      },
    });
  }

  // Create formData object and save
  const newFormData = new DBFormDataModel<DBFormData>({
    formId: form.simpleId,
    url,
    created: {
      user: userData.userId || null,
      date: new Date(),
    },
    edited: [],
    owner: form.fillerIsFormDataOwner ? userData.userId || null : form.formDataOwner || null,
    hasElemPrivileges,
    privileges: form.formDataDefaultPrivileges,
    data: saveData,
  });
  const savedFormData = await newFormData.save();
  if (!savedFormData) {
    return res.send(
      new errors.DB_GENERAL_ERROR(
        `could not PUT/edit new formData for formId: '${form.simpleId}', url: ${url}`
      )
    );
  }

  const newDataId = savedFormData._id.toString();
  const returnResponse: FormDataPutReply = { ok: true, dataId: newDataId };

  if (body.getData) {
    const params = { ...body.getData, ...(!body.getData.dataId ? { dataId: [newDataId] } : {}) };
    const getDataResult = await getFormData(params, form, userData, csrfIsGood);
    returnResponse.getData = getDataResult;
  }

  return res.send(returnResponse);
};

import type { RouteHandler } from 'fastify';
import { Types } from 'mongoose';

import type { CustomGetRoute, CustomPostRoute, GetReply } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel, { type DBFormData } from '../../dbModels/formData';
import DBPrivilegeModel, { type DBPrivilege } from '../../dbModels/privilege';
import { errors } from '../../core/errors';
import { apiRoot } from '../../core/app';
import { apiVersion } from '../../core/apis';
import { isCsrfGood } from '../../hooks/csrf';
import { getUserData, isPrivBlocked } from '../../utils/userAndPrivilegeChecks';

export const customPost: RouteHandler<CustomPostRoute> = async (req, res) => {
  const body = req.body;

  // @TODO: get current form
  const form = await DBFormModel.findOne<unknown>({ simpleId: body.formId || null });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find formData with formId: '${body.formId}'`));
  }
  console.log('formData', form);
  // @TODO: check CSRF header (if enabled in form data)
  // @TODO: check authorization
  // @TODO: validate incoming body fields against the form data

  console.log('TADAAAAAAAAAAA POST');
  return res.send({ ok: true });
};

export const customGet: RouteHandler<CustomGetRoute> = async (req, res) => {
  const { getForm, dataId, elemId, flat, offset, limit, orderBy, orderDir, s } = req.query;
  const url = req.url.split('?')[0].replace(apiRoot + apiVersion, '');

  if (!getForm && !dataId) {
    return res.send(
      new errors.FORM_DATA_BAD_REQUEST(
        `Both, "getForm" and "dataId" query string values were missing with url "${req.url}"`
      )
    );
  }

  // Check that form exists
  const form = await DBFormModel.findOne<DBForm>({ url });
  if (!form) {
    return res.send(new errors.NOT_FOUND(`Could not find form with url "${req.url}"`));
  }

  // Get CSRF result
  const csrfIsGood = isCsrfGood(req);

  // Get user data
  const userData = await getUserData(req);

  const returnObject: GetReply = {};
  if (getForm) {
    const privilegeId = `form__${form.simpleId}__canUseForm`;
    const privilege = await DBPrivilegeModel.findOne<DBPrivilege>({ simpleId: privilegeId });
    const privError = isPrivBlocked(privilege?.privilegeAccess, userData, csrfIsGood);
    returnObject['$form'] = privError?.code || form.form;
  }

  let formData = null,
    canBeFlat = false;
  if (dataId && dataId[0] === 'all') {
    // Get all data
    // @TODO: set a upper limit of maximum dataItems per request (implement offset and limit)
    const MAX_LIMIT = 500;
    // @TODO: add populate methods
    formData = await DBFormDataModel.find<DBFormData[]>({ formId: form.simpleId }).limit(MAX_LIMIT);
  } else if (Array.isArray(dataId) && dataId?.length > 1) {
    // Get specific formData items
    const dataObjectIds = dataId.map((id) => new Types.ObjectId(id));
    formData = await DBFormDataModel.find<DBFormData[]>({
      $and: [{ formId: form.simpleId }, { _id: { $in: dataObjectIds } }],
    });
  } else if (dataId) {
    // Get one formData item
    formData = await DBFormDataModel.findById<DBFormData>(dataId[0]);
    canBeFlat = true;
  }

  console.log(
    'TADAAAAAAAAAAA GET',
    formData,
    canBeFlat,
    elemId,
    flat,
    offset,
    limit,
    orderBy,
    orderDir,
    s
  );
  return res.send(returnObject);
};

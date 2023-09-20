import type { RouteHandler } from 'fastify';

import type { CustomGetRoute, CustomPostRoute } from './routes';
import DBFormModel from '../../dbModels/form';
import { errors } from '../../core/errors';

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
  let formId;
  if (dataId) {
    if (!formId) {
      // Get formId from formData
    }
  }
  if (getForm) {
    // Get formId from form
  }

  console.log(
    'TADAAAAAAAAAAA GET',
    getForm,
    dataId,
    elemId,
    flat,
    offset,
    limit,
    orderBy,
    orderDir,
    s
  );
  return res.send({ ok: true });
};

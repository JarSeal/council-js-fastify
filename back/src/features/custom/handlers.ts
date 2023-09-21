import type { RouteHandler } from 'fastify';
import { type Schema, Types } from 'mongoose';

import type { CustomGetRoute, CustomPostRoute, GetReply } from './routes';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import DBFormDataModel, { type DBFormData } from '../../dbModels/formData';
import DBGroupModel from '../../dbModels/group';
import { errors } from '../../core/errors';
import { apiRoot } from '../../core/app';
import { apiVersion } from '../../core/apis';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../../core/config';

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

type UserData = {
  isSignedIn: boolean;
  userId: Schema.Types.ObjectId | null;
  userGroups: Schema.Types.ObjectId[];
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
  const isCsrfGood = req.headers[CSRF_HEADER_NAME] === CSRF_HEADER_VALUE;

  // Get user data
  const { isSignedIn, userId } = req.session;
  const userData: UserData = {
    isSignedIn: isSignedIn || false,
    userId: userId || null,
    userGroups: [],
  };
  if (isSignedIn) {
    const userGroups = await DBGroupModel.find<{ simpleId: Schema.Types.ObjectId }>({
      members: req.session.userId,
    }).select('simpleId');
    userData.userGroups = userGroups.map((ug) => ug.simpleId);
  }

  const returnObject: GetReply = {};
  if (getForm) {
    // @TODO: add form privilege access check
    returnObject['$form'] = form.form;
  }

  let formData = null;
  if (dataId && dataId[0] === 'all') {
    // Get all data
    // @TODO: set a upper limit of maximum dataItems per request (implement offset and limit)
    // @TODO: add populate methods
    formData = await DBFormDataModel.find<DBFormData[]>({ formId: form.simpleId }).populate(
      'created.user',
      'simpleId -_id'
    );
  } else if (Array.isArray(dataId) && dataId?.length > 1) {
    // Get specific formData items
    const dataObjectIds = dataId.map((id) => new Types.ObjectId(id));
    formData = await DBFormDataModel.find<DBFormData[]>({
      $and: [{ formId: form.simpleId }, { _id: { $in: dataObjectIds } }],
    }).populate('created.user', 'simpleId -_id');
  } else if (dataId) {
    // Get one formData item
    formData = await DBFormDataModel.findById<DBFormData>(dataId[0]).populate(
      'created.user',
      'simpleId -_id'
    );
  }

  console.log(
    'TADAAAAAAAAAAA GET',
    formData,
    isCsrfGood,
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

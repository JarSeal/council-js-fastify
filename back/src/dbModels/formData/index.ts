import { type PaginateModel, model } from 'mongoose';

import DBFormDataModel, { type DBFormData, formDataSchema } from '../formData.js';

// All non-default formData models:
// ********************************

// UserData
export const DBUserDataModel = model<DBFormData, PaginateModel<DBFormData>>(
  'UserData',
  formDataSchema,
  'userData'
);

// getFormDataModel
const getFormDataModel = (url: string) => {
  switch (url) {
    case '/api/v1/sys/userdata':
      return DBUserDataModel;
    default:
      return DBFormDataModel;
  }
};

export default getFormDataModel;

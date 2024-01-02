import { type PaginateModel, model } from 'mongoose';

import DBFormDataModel, { type DBFormData, formDataSchema } from '../formData';

// All non-default formData models:
// ********************************

// UserData
const DBUserDataModel = model<DBFormData, PaginateModel<DBFormData>>(
  'UserData',
  formDataSchema,
  'userData'
);

// getFormDataModel
const getFormDataModel = (url: string) => {
  switch (url) {
    case 'userdata':
      return DBUserDataModel;
    default:
      return DBFormDataModel;
  }
};

export default getFormDataModel;

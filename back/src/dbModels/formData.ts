import { type Types, type PaginateModel, Schema, model } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

import {
  basicPrivilegePropsSchema,
  dateDBSchema,
  formDataPrivilegesSchema,
} from './_schemaPartials';
import type { BasicPrivilegeProps, Edited, FormDataPrivileges } from './_modelTypePartials';

export interface DBFormData {
  // Mongo ID
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Form ID (simpleId)
  formId: string;

  // API url
  url: string;

  // Logs and owner
  created: {
    user: Types.ObjectId | { simpleId: string } | null;
    date: Date;
  };
  edited: Edited;
  owner: Types.ObjectId | { simpleId: string } | null;

  // Whether elements' have specific privileges that need to be checked (optimisation)
  hasElemPrivileges?: boolean;

  // Privileges for all elements, but these are overridden if element has specific privileges
  privileges: FormDataPrivileges;

  // Who or what group(s) can and cannot edit privileges
  canEditPrivileges?: BasicPrivilegeProps;

  // Form element data
  data: {
    // Element Id (simpleId)
    elemId: string;

    // Actual data value
    value: unknown;

    // Element specific privileges
    privileges?: Omit<FormDataPrivileges, 'create'>;
  }[];
}

const formDataSchema = new Schema<DBFormData>({
  formId: { type: String, required: true, index: true },
  url: { type: String, required: true },
  created: {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    date: dateDBSchema,
  },
  edited: [
    {
      _id: false,
      user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
      },
      date: dateDBSchema,
    },
  ],
  owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  hasElemPrivileges: { type: Boolean },
  privileges: formDataPrivilegesSchema,
  canEditPrivileges: basicPrivilegePropsSchema,
  data: [
    {
      _id: false,
      elemId: { type: String, required: true },
      value: { type: Schema.Types.Mixed, required: true, index: true },
      privileges: formDataPrivilegesSchema,
    },
  ],
});

formDataSchema.plugin(mongoosePaginate);

formDataSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBFormDataModel = model<DBFormData, PaginateModel<DBFormData>>(
  'FormData',
  formDataSchema,
  'formData'
);

export default DBFormDataModel;

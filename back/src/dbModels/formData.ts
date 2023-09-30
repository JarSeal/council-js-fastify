import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, formDataPrivilegesSchema } from './_schemaPartials';
import type { Edited, FormDataPrivileges, FormDataValueType } from './_modelTypePartials';

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
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited;
  owner: Types.ObjectId;

  // Whether elements' have specific privileges that need to be checked (optimisation)
  hasElemPrivileges?: boolean;

  // Privileges for all elements, but these are overridden if element has specific privileges
  privileges: FormDataPrivileges;

  // Form element data
  data: {
    // Element Id (simpleId)
    elemId: string;

    // Order number (this is normalised for partial data sets that are returned)
    orderNr: number;

    // Actual data value
    value: unknown;

    // Data value type
    valueType: FormDataValueType;

    // Element specific privileges
    privileges?: Omit<FormDataPrivileges, 'create'>;
  }[];
}

const formDataSchema = new Schema<DBFormData>({
  formId: simpleIdDBSchema,
  url: { type: String, unique: true, required: true },
  created: {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, default: null },
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
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, default: null },
  hasElemPrivileges: { type: Boolean },
  privileges: formDataPrivilegesSchema,
  data: [
    {
      _id: false,
      elemId: { type: String, required: true },
      orderNr: { type: Number, required: true },
      value: { type: Schema.Types.Mixed, required: true },
      valueType: { type: String, required: true },
      privileges: formDataPrivilegesSchema,
    },
  ],
});

formDataSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBFormDataModel = model<DBFormData>('FormData', formDataSchema, 'formData');

export default DBFormDataModel;

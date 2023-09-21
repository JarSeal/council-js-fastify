import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, formDataPrivilegesSchema } from './_schemaPartials';
import type { Edited, FormDataPrivileges, FormDataValueType } from './_modelTypePartials';

export interface DBFormData {
  id?: string;
  formId: string;
  url: string;
  created: {
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited;
  owner: Types.ObjectId;
  privileges: FormDataPrivileges;
  data: {
    elemId: string;
    orderNr: number;
    value: unknown;
    valueType: FormDataValueType;
    privileges: FormDataPrivileges;
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
      },
      ref: 'User',
      date: dateDBSchema,
    },
  ],
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true, default: null },
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

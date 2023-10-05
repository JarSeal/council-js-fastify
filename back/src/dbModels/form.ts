import { type Types, Schema, model } from 'mongoose';

import {
  simpleIdDBSchema,
  dateDBSchema,
  formElemDbSchema,
  formDataPrivilegesSchema,
  transTextDbSchema,
} from './_schemaPartials';
import type { Edited, FormDataPrivileges, FormElem, TransText } from './_modelTypePartials';

export interface DBForm {
  // Mongo ID
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council simpleId
  simpleId: string;

  // Metadata and logs
  name: string;
  description: string;
  created: {
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited;
  systemDocument: boolean;
  owner: Types.ObjectId | null;

  // API url
  url: string;

  // Form
  form: {
    // Form metadata
    formTitle?: TransText;
    formText?: TransText;
    classes?: string[];

    // Whether the formElems' order can be changed or not
    lockOrder?: boolean;

    // Form elements
    formElems: FormElem[];
  };

  // Whether the form can be sent with only partial payload
  disablePartialSaving?: boolean;

  // How many documents can be sent with this form per user/owner (must be signed in)
  // Usually this is either undefined or 1 (undefined = infinite)
  maxDataOwnerDocs?: number;

  // Form data owner
  formDataOwner?: Types.ObjectId | null;

  // Whether the formData owner is the one who fills the form (formDataOwner must be undefind or null)
  fillerIsFormDataOwner?: boolean;

  // Default privileges to be passed to the formData document
  formDataDefaultPrivileges: FormDataPrivileges;
}

const formSchema = new Schema<DBForm>({
  simpleId: simpleIdDBSchema,
  name: { type: String, required: true, default: null },
  description: { type: String, required: true, default: null },
  created: {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    date: dateDBSchema,
  },
  edited: [
    {
      _id: false,
      user: { type: Schema.Types.ObjectId, ref: 'User' },
      date: dateDBSchema,
    },
  ],
  systemDocument: { type: Boolean, default: false },
  owner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  url: { type: String, unique: true, required: true },
  form: {
    formTitle: transTextDbSchema,
    formText: transTextDbSchema,
    classes: [{ _id: false, type: String }],
    lockOrder: { type: Boolean, default: false },
    formElems: [formElemDbSchema],
  },
  disablePartialSaving: { type: Boolean },
  maxDataOwnerDocs: { type: Number },
  formDataOwner: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  fillerIsFormDataOwner: { type: Boolean },
  formDataDefaultPrivileges: formDataPrivilegesSchema,
});

formSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBFormModel = model<DBForm>('Form', formSchema, 'forms');

export default DBFormModel;

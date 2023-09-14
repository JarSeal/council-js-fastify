import { type Types, Schema, model } from 'mongoose';

import {
  simpleIdDBSchema,
  dateDBSchema,
  formElemDbSchema,
  formDataPrivilegesSchema,
} from './_schemaPartials';
import type { Edited, FormDataOwner, FormDataPrivileges, FormElem } from './_modelTypePartials';

export interface DBForm {
  id?: string;
  simpleId: string;
  name: string;
  description: string;
  created: {
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited;
  systemDocument: boolean;
  owner: Types.ObjectId;
  url: string;
  form: {
    formTitle?: { [key: string]: string };
    formTitleLangKey?: string;
    formText?: { [key: string]: string };
    formTextLangKey?: string;
    classes?: string[];
    disablePartialSaving?: boolean;
    lockOrder?: boolean;
    maxDataOwnerItems?: number;
    formDataOwner: FormDataOwner;
    formElems: FormElem[];
  };
  formDataPrivileges?: FormDataPrivileges;
}

const formSchema = new Schema<DBForm>({
  simpleId: simpleIdDBSchema,
  name: { type: String, required: true, default: null },
  description: { type: String, required: true, default: null },
  created: {
    user: { type: Schema.Types.ObjectId, required: true, default: null },
    date: dateDBSchema,
  },
  edited: [
    {
      _id: false,
      user: {
        type: Schema.Types.ObjectId,
      },
      date: dateDBSchema,
    },
  ],
  systemDocument: { type: Boolean, default: false },
  owner: { type: Schema.Types.ObjectId, required: true },
  url: { type: String, unique: true, required: true },
  form: {
    formTitle: Object,
    formTitleLangKey: String,
    formText: Object,
    formTextLangKey: String,
    classes: [{ _id: false, type: String }],
    disablePartialSaving: { type: Boolean },
    lockOrder: { type: Boolean, default: false },
    maxDataOwnerItems: { type: Number },
    formDataOwner: { type: String, required: true, default: 'none' },
    formElems: [formElemDbSchema],
  },
  formDataPrivileges: formDataPrivilegesSchema,
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

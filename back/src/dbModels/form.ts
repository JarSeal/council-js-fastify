import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, formElemDbSchema } from './_schemaPartials';
import type { Edited, FormElem } from './_modelTypePartials';

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
  systemDocument?: boolean;
  owner: Types.ObjectId;
  url: string;
  form: {
    formTitle?: { [key: string]: string };
    formTitleLangKey?: string;
    formText?: { [key: string]: string };
    formTextLangKey?: string;
    classes: string[];
    formElems: FormElem[];
  };
}

const formSchema = new Schema<DBForm>({
  simpleId: simpleIdDBSchema,
  name: { type: String, required: true, default: null },
  description: String,
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
  url: { type: String, required: true },
  form: {
    formTitle: Object,
    formTitleLangKey: String,
    formText: Object,
    formTextLangKey: String,
    classes: [{ _id: false, type: String }],
    formElems: [formElemDbSchema],
  },
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

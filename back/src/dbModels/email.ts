import { type Types, Schema, model } from 'mongoose';

import { simpleIdDBSchema, dateDBSchema, transTextDbSchema } from './_schemaPartials';
import type { Edited, TransText } from './_modelTypePartials';

export interface DBEmail {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council simpleId
  simpleId: string;

  // Email metadata and logs
  name: TransText;
  description: TransText;
  created: {
    user: Types.ObjectId | null;
    date: Date;
  };
  edited: Edited[];
  editedHistoryCount?: number;
  systemDocument?: boolean;

  // Email subject
  subject: string;

  // Email template
  template: string;
  templateVarKeys: string[];
  wrapperTemplateId?: string;

  // Whether the email is an HTML template wrapper or not
  isHtmlTemplateWrapper: boolean;
}

const groupSchema = new Schema<DBEmail>({
  simpleId: simpleIdDBSchema,
  name: transTextDbSchema,
  description: transTextDbSchema,
  created: {
    user: { type: Schema.Types.ObjectId, required: true, default: null },
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
  editedHistoryCount: { type: Number },
  systemDocument: { type: Boolean, default: false },
  subject: { type: String },
  template: { type: String, required: true },
  templateVarKeys: [{ _id: false, type: String }],
  wrapperTemplateId: { type: String },
  isHtmlTemplateWrapper: { type: Boolean, default: false },
});

groupSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBEmailModel = model<DBEmail>('Email', groupSchema, 'emails');

export default DBEmailModel;

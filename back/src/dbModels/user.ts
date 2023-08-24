import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

import { simpleIdDBSchema, emailDBSchema, dateDBSchema, tokenDbSchema } from './_partials';
import type { Edited, Token } from '../types/modelPartials';

export interface DBUser {
  simpleId: string;
  emails: {
    email: string;
    verified: boolean;
    token: Token;
    added: Date;
  }[];
  passwordHash: string;
  created: {
    user: Types.ObjectId | null;
    publicForm: boolean;
    date: Date;
  };
  edited: Edited;
  systemDocument?: boolean;
}

const userSchema = new Schema<DBUser>({
  simpleId: simpleIdDBSchema,
  emails: [
    {
      _id: false,
      email: emailDBSchema,
      verified: {
        type: Boolean,
        required: true,
        default: false,
      },
      token: tokenDbSchema,
      added: dateDBSchema,
    },
  ],
  passwordHash: String,
  created: {
    user: {
      type: Schema.Types.ObjectId,
    },
    publicForm: Boolean,
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
});

userSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
  },
});

const DBUserModel = model<DBUser>('User', userSchema, 'users');

export default DBUserModel;

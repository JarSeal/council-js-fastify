import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

import { simpleIdDBSchema, emailDBSchema, dateDBSchema } from './_partials';
import type { Edited } from '../types/modelPartials';

export interface DBUser {
  simpleId: string;
  emails: {
    email: string;
    verified: boolean;
    token?: string | null;
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
      token: {
        type: String,
        default: null,
      },
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

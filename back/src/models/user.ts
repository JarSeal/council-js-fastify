import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

import { simpleIdSchema, emailSchema, dateSchema } from './_partials';
import type { Edited } from '../types/modelPartials';

export interface DBUser {
  simpleId: string;
  emails: {
    email: string;
    verified: boolean;
    prevEmail?: string | null;
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
  simpleId: simpleIdSchema,
  emails: [
    {
      _id: false,
      email: emailSchema,
      prevEmail: { ...emailSchema, required: false, unique: false },
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
    date: dateSchema,
  },
  edited: [
    {
      _id: false,
      user: {
        type: Schema.Types.ObjectId,
      },
      date: dateSchema,
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

const User = model<DBUser>('User', userSchema, 'users');

export default User;

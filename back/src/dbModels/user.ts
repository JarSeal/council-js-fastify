import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

import { simpleIdDBSchema, emailDBSchema, dateDBSchema, tokenDbSchema } from './_schemaPartials';
import type { Edited, Token } from './_modelTypePartials';

export interface DBUser {
  id?: string;
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
  security: {
    forcePassChange?: boolean;
    loginAttempts?: number;
    coolDownStarted?: Date | null;
    isUnderCoolDown?: boolean;
    lastLoginAttempts: {
      date: Date;
      agentId: string;
    }[];
    lastLogins: {
      date: Date;
      agentId: string;
    }[];
  };
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
  passwordHash: { type: String, required: true },
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
  security: {
    forcePassChange: { type: Boolean, required: true, default: false },
    loginAttempts: { type: Number, default: 0 },
    coolDownStarted: { ...dateDBSchema, required: false, default: null },
    isUnderCoolDown: { type: Boolean, required: true, default: false },
    lastLoginAttempts: [
      {
        _id: false,
        date: dateDBSchema,
        agentId: { type: String, required: true, minlength: 32, maxlength: 32 },
      },
    ],
    lastLogins: [
      {
        _id: false,
        date: dateDBSchema,
        agentId: { type: String, required: true, minlength: 32, maxlength: 32 },
      },
    ],
  },
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

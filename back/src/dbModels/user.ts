import { Schema, model } from 'mongoose';
import type { Types } from 'mongoose';

import { simpleIdDBSchema, emailDBSchema, dateDBSchema, tokenDbSchema } from './_schemaPartials';
import type { Edited, Token } from './_modelTypePartials';

export interface DBUser {
  // Mongo Id
  _id?: Types.ObjectId;
  id?: Types.ObjectId;

  // Council Id (in this case, this is the username)
  simpleId: string;

  // Emails array, where the first item is the primary email
  emails: {
    email: string;
    verified: boolean;
    token: Token;
    added: Date;
  }[];

  // Password
  passwordHash: string;

  // Logs
  created: {
    user: Types.ObjectId | null;
    publicForm: boolean;
    date: Date;
  };
  edited: Edited[];
  editedHistoryCount?: number;

  // Only the super admin has a system document
  systemDocument?: boolean;

  // Security settings
  security: {
    // Force a pass change after next login
    forcePassChange?: boolean;

    // Forgot pass / new pass token
    newPassToken?: Token;

    // Failed login attempts count, this is reset after a successfull
    // login or when the cool down period has ended
    loginAttempts?: number;

    // Cool down started time
    coolDownStarted?: Date | null;

    // Whether the user is under cool down or not
    isUnderCoolDown?: boolean;

    // 2FA code and created date
    twoFA: {
      code: string | null;
      date: Date | null;
      resendDate: Date | null;
    };

    // Login logs
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
      ref: 'User',
      default: null,
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
  editedHistoryCount: { type: Number },
  systemDocument: { type: Boolean, default: false },
  security: {
    forcePassChange: { type: Boolean, required: true, default: false },
    newPassToken: tokenDbSchema,
    loginAttempts: { type: Number, default: 0 },
    coolDownStarted: { ...dateDBSchema, required: false, default: null },
    isUnderCoolDown: { type: Boolean, required: true, default: false },
    twoFA: {
      code: { type: String },
      date: { ...dateDBSchema, required: false, default: null },
      resendDate: { ...dateDBSchema, required: false, default: null },
    },
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

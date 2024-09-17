import mongoose, { Schema, type Types } from 'mongoose';

import { simpleIdDBSchema } from './_schemaPartials';
import { requiredActionsDBSchema, type RequiredActions } from '../features/login/schemas';

export interface Session {
  cacheSetData?: Date;

  // Whether the current user is signed in or not
  isSignedIn: boolean;

  // user and client data
  username: string;
  userId: Types.ObjectId;
  agentId: string;
  userGroups?: Types.ObjectId[];
  isSysAdmin?: boolean;

  // required actions from user
  requiredActions: RequiredActions;

  // Cookie
  cookie: {
    path?: string;
    secure?: boolean | 'auto';
    httpOnly?: boolean;
    originalMaxAge: number | null;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
    domain?: string;
    expires?: Date | null;
    _expires?: Date | null;
  };
}

export interface DBSession {
  sessionId: string;
  username: string;
  expires: Date;
  session: Session;
  systemDocument?: boolean;
}

const sessionSchema = new Schema<DBSession>({
  sessionId: String,
  username: simpleIdDBSchema,
  expires: { type: Date, required: true },
  systemDocument: { type: Boolean, default: true },
  session: {
    cacheSetData: Date,
    isSignedIn: Boolean,
    username: String,
    userId: Schema.Types.ObjectId,
    agentId: String,
    userGroups: [Schema.Types.ObjectId],
    isSysAdmin: Boolean,
    requiredActions: requiredActionsDBSchema,
    cookie: {
      path: { type: String, default: '/' },
      secure: { type: Boolean, default: true },
      sameSite: { type: String, default: null },
      domain: { type: String, default: null },
      httpOnly: { type: Boolean, default: true },
      _expires: { type: Date, required: true },
      originalMaxAge: {
        type: Number,
        required: true,
      },
    },
  },
});

sessionSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
  },
});

const DBSessionModel = mongoose.model<DBSession>('Session', sessionSchema, 'sessions');

export default DBSessionModel;

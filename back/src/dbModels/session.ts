import mongoose from 'mongoose';

import { simpleIdDBSchema } from './_partials';
import { getConfig } from '../core/config';

export interface Session {
  isSignedIn: boolean;
  username: string;
  userId: string;
  cookie: {
    path: string;
    secure: boolean;
    sameSite?: 'strict' | 'lax' | 'none' | boolean;
    domain: string;
    httpOnly: boolean;
    _expires: Date;
    originalMaxAge: number;
  };
}

export interface DBSession {
  sessionId: string;
  username: string;
  expires: Date;
  systemDocument?: boolean;
  session: Session;
}

const sessionSchema = new mongoose.Schema<DBSession>({
  sessionId: String,
  username: simpleIdDBSchema,
  expires: { type: Date, required: true },
  systemDocument: { type: Boolean, default: true },
  session: {
    isSignedIn: Boolean,
    username: String,
    userId: String,
    cookie: {
      path: { type: String, default: '/' },
      secure: { type: Boolean, default: true },
      sameSite: { type: String, default: null },
      domain: { type: String, default: null },
      httpOnly: { type: Boolean, default: true },
      _expires: { type: Date, required: true },
      originalMaxAge: { type: Number, default: getConfig<number>('user.sessionMaxAge') },
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

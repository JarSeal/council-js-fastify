import type { Session } from 'fastify';

import DBSessionModel, { type DBSession } from '../dbModels/session';
import { errors } from './errors';

export const sessionStore = {
  set: (sessionId: string, session: Session, callback: (err?: unknown) => void) => {
    console.log('SESS STORE SET', sessionId, session.username);
    callback();
  },
  get: async (
    sessionId: string,
    callback: (err: unknown, result?: Session | null | undefined) => void
  ) => {
    let foundSession,
      error = null;
    try {
      foundSession = await DBSessionModel.findOne<DBSession>({ sessionId }).lean();
    } catch (err) {
      error = err;
    }
    if (error) {
      error = new errors.SESSION_GET_FROM_STORE_ERR(JSON.stringify(error));
      return callback(error, null);
    }
    if (!foundSession) {
      console.log('SESS STORE GET');
      return callback(null, null);
    }
    callback(null, foundSession.session);
  },
  destroy: (sessionId: string, callback: (err?: unknown) => void) => {
    console.log('SESS STORE DESTROY', sessionId);
    callback();
  },
};

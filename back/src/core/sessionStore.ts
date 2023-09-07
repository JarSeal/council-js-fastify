import type { Session } from 'fastify';

import DBSessionModel, { type DBSession } from '../dbModels/session';
import { errors } from './errors';

export const sessionStore = {
  // *****************************************
  // SET SESSION
  set: async (sessionId: string, session: Session, callback: (err?: unknown) => void) => {
    if (!session?.isSignedIn || !session?.username) return callback();
    try {
      await DBSessionModel.deleteOne({ username: session.username }).lean();
    } catch (err) {
      const error = new errors.SESSION_DEL_ERR(`In set session: ${JSON.stringify(err)}`);
      return callback(error);
    }

    // Save session to store
    const newSession = new DBSessionModel<DBSession>({
      sessionId,
      username: session.username,
      expires: session.cookie.expires || new Date(),
      session: {
        isSignedIn: session.isSignedIn,
        username: session.username,
        userId: session.userId,
        agentId: session.agentId,
        cookie: session.cookie,
      },
    });
    try {
      await newSession.save();
    } catch (err) {
      const error = new errors.SESSION_SET_TO_STORE_ERR(
        `Save session error: ${JSON.stringify(err)}`
      );
      return callback(error);
    }
    callback();
  },

  // *****************************************
  // GET SESSION
  get: async (
    sessionId: string,
    callback: (err: unknown, result?: Session | null | undefined) => void
  ) => {
    let result;
    try {
      result = await DBSessionModel.findOne<DBSession>({ sessionId }).lean();
    } catch (err) {
      const error = new errors.SESSION_GET_FROM_STORE_ERR(JSON.stringify(err));
      return callback(error, null);
    }
    if (!result) {
      return callback(null, null);
    }
    callback(null, result.session);
  },

  // *****************************************
  // DESTROY SESSION
  destroy: async (sessionId: string, callback: (err?: unknown) => void) => {
    let foundSession;
    try {
      foundSession = await DBSessionModel.findOne<DBSession>({ sessionId }).lean();
    } catch (err) {
      const error = new errors.SESSION_GET_FROM_STORE_ERR(
        `In destroy session, get session error: ${JSON.stringify(err)}`
      );
      return callback(error);
    }
    if (foundSession) {
      try {
        await DBSessionModel.deleteMany({ username: foundSession.username }).lean();
      } catch (err) {
        const error = new errors.SESSION_DEL_ERR(`Destroy session error: ${JSON.stringify(err)}`);
        return callback(error);
      }
    }
    callback();
  },
};

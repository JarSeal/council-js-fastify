import mongoose from 'mongoose';
import type { FastifyInstance, Session } from 'fastify';

import { sessionStore } from './sessionStore';
import initApp from './app';
import DBSessionModel, { type DBSession } from '../dbModels/session';

const validAgentId = '726616f4bb878fab94f1f1dbc8c6ed79';

describe('sessionStore', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  const sessionId = 'mySessionId';

  it('should set to, get from, and destroy from sessionStore successfully', async () => {
    const username = 'myusername';
    const userId = 'userId';
    const expires = new Date(Date.now() + 20000);
    const session = {
      isSignedIn: true,
      username,
      userId,
      agentId: validAgentId,
      cookie: {
        path: '/',
        secure: false,
        httpOnly: false,
        originalMaxAge: 20000,
        sameSite: 'lax',
        _expires: expires,
      },
    } as Session;

    // Set session
    await sessionStore.set(sessionId, session, () => null);

    let savedSession = await DBSessionModel.findOne<DBSession>({ sessionId });
    expect(savedSession?.sessionId).toBe(sessionId);
    expect(savedSession?.username).toBe(username);
    expect((savedSession?.expires.getTime() || 0) + 20000).toBeCloseTo(expires.getTime(), -3);
    expect(savedSession?.session.agentId).toBe(validAgentId);
    expect(savedSession?.session.isSignedIn).toBeTruthy();
    expect(savedSession?.session.username).toBe(username);
    expect(savedSession?.session.userId).toBe(userId);
    expect(savedSession?.session.cookie).toBeTruthy();
    expect(savedSession?.session.cookie.path).toBe('/');
    expect((savedSession?.session.cookie._expires || new Date()).getTime()).toBeCloseTo(
      expires.getTime()
    );

    // Get session
    await sessionStore.get(sessionId, (_, fetchedSession) => {
      expect(fetchedSession?.isSignedIn).toBeTruthy();
      expect(fetchedSession?.username).toBe(username);
      expect(fetchedSession?.userId).toBe(userId);
      expect(fetchedSession?.agentId).toBe(validAgentId);
      expect(fetchedSession?.cookie).toBeTruthy();
      expect(fetchedSession?.cookie.path).toBe('/');
      expect(fetchedSession?.cookie.secure).toBeFalsy();
      expect(fetchedSession?.cookie.sameSite).toBe('lax');
      expect(fetchedSession?.cookie.httpOnly).toBeFalsy();
      expect(fetchedSession?.cookie.originalMaxAge).toBe(20000);
      expect(fetchedSession?.cookie.domain).toBe(null);
    });

    await sessionStore.destroy(sessionId, () => null);

    // Destroy session
    savedSession = await DBSessionModel.findOne<DBSession>({ sessionId });
    expect(savedSession).toBe(null);
  });

  it('should not find a session with non-existing sessionId with get from sessionStore', async () => {
    await sessionStore.get(sessionId, (_, fetchedSession) => {
      expect(fetchedSession).toBe(null);
    });

    await sessionStore.get('someNonExistingSessionId', (_, fetchedSession) => {
      expect(fetchedSession).toBe(null);
    });
  });
});

import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import type { PublicSignUpRoute } from './schemas';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import { getTimestamp, getTimestampFromDate } from '../utils/timeAndDate';
import { csrfHeader } from '../../test/utils';

describe('publicSignUp', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should fail without the CSRF header', async () => {
    const username = 'myusername';
    const pass = 'somepass';
    const email = 'myusername@somedomain.nl';
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username, pass, email },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toEqual('CSRF-header is invalid or missing');
  });

  it('should fail the publicSignUp without proper payload', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body must be object');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username: 'myusername' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'email'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { email: 'my.email@server.com' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'username'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { email: 'my.email@server.com', username: 'myusername' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'pass'");
  });

  it('should fail the publicSignUp with invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username: 'myusername', pass: 'somepass', email: 'not_email' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/email must match format "email"');
  });

  it('should fail the publicSignUp with too short username', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username: '', pass: 'somepass', email: 'aa@aa.aa' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('COUNCL_ERR_VALIDATE');
    expect(
      body.message.startsWith('New user validation failed: Username is too short')
    ).toBeTruthy();
  });

  it('should fail the publicSignUp with too short password', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username: 'myusername', pass: '', email: 'aa@aa.aa' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('COUNCL_ERR_VALIDATE');
    expect(
      body.message.startsWith('New user validation failed: Password is too short')
    ).toBeTruthy();
  });

  it('should successfully register a new user', async () => {
    const username = 'myusername';
    const pass = 'somepass';
    const email = 'myusername@somedomain.nl';
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username, pass, email },
      ...csrfHeader,
    });
    const timeNow = getTimestamp();
    const body = JSON.parse(response.body) as PublicSignUpRoute['Body'];
    expect(body).toStrictEqual({ ok: true });

    const user = await DBUserModel.findOne<DBUser>({ simpleId: username });

    expect(user?.simpleId).toBe(username);

    expect(user?.emails[0].email).toBe(email);
    expect(user?.emails[0].verified).toBeFalsy();
    expect(user?.emails[0].token).toBeTruthy();
    expect(user?.emails[0].added).toBeTruthy();
    expect(getTimestampFromDate(user?.emails[0].added || new Date()) > timeNow - 3).toBeTruthy();
    expect(getTimestampFromDate(user?.emails[0].added || new Date()) < timeNow + 3).toBeTruthy();

    expect(user?.passwordHash).toBeTruthy();

    expect(user?.created.user).toBe(null);
    expect(user?.created.publicForm).toBeTruthy();
    expect(user?.created.date).toBeTruthy();
    expect(getTimestampFromDate(user?.created.date || new Date()) > timeNow - 3).toBeTruthy();
    expect(getTimestampFromDate(user?.created.date || new Date()) < timeNow + 3).toBeTruthy();

    expect(Array.isArray(user?.edited)).toBeTruthy();
    expect(user?.edited).toHaveLength(0);

    expect(user?.systemDocument).toBeFalsy();

    expect(user?.security.forcePassChange).toBeFalsy();
    expect(user?.security.loginAttempts).toBe(0);
    expect(user?.security.coolDownStarted).toBe(null);
    expect(user?.security.isUnderCoolDown).toBeFalsy();
    expect(Array.isArray(user?.security.lastLoginAttempts)).toBeTruthy();
    expect(user?.security.lastLoginAttempts).toHaveLength(0);
    expect(Array.isArray(user?.security.lastLogins)).toBeTruthy();
    expect(user?.security.lastLogins).toHaveLength(0);
  });
});

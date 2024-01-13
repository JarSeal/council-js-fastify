import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { SESSION_COOKIE_NAME, getConfig } from '../../core/config';
import type { LoginRoute } from './schemas';
import type { LogoutRoute } from '../logout/schemas';
import { csrfHeader, validAgentId } from '../../test/utils';

describe('login', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  const createUser = async (username?: string, email?: string, pass?: string) => {
    if (!username) username = 'myusername';
    if (!email) email = 'aa@aa.com';
    if (!pass) pass = 'myPa$$word1';
    await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username, pass, email },
      ...csrfHeader,
    });
    return { username, pass, email };
  };

  it('should fail without the CSRF header', async () => {
    const user = await createUser('csrfUser', 'csrfPassword');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: user.username,
        pass: user.pass,
        loginMethod: 'username',
        agentId: validAgentId,
      },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toEqual('CSRF-header is invalid or missing');
  });

  it('should fail the login without proper payload', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body must be object');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { usernameOrEmail: 'myusername' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'pass'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { pass: 'myPa$$word1' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'usernameOrEmail'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { usernameOrEmail: 'myusername', pass: 'myPa$$word1' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'loginMethod'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { usernameOrEmail: 'myusername', pass: 'myPa$$word1', loginMethod: 'username' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'agentId'");
  });

  it('should fail the login with invalid payload values', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'myPa$$word1',
        loginMethod: 'username',
        agentId: '',
      },
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/agentId must NOT have fewer than 32 characters');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'myPa$$word1',
        loginMethod: 'username',
        agentId: '726616f4bb878fab94f1f1dbc8c6ed79_45',
      },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/agentId must NOT have more than 32 characters');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'myPa$$word1',
        loginMethod: 'unknown',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual(
      'body/loginMethod must be equal to constant, body/loginMethod must be equal to constant, body/loginMethod must match a schema in anyOf'
    );

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'myPa$$word1',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('LOGIN_USER_OR_PASS_WRONG');
    expect(body.message).toEqual('Password or username wrong');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'myPa$$word1',
        loginMethod: 'email',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('LOGIN_USER_OR_PASS_WRONG');
    expect(body.message).toEqual('Password or email wrong');
  });

  it('should set the user to a cooldown period when giving wrong password too many times', async () => {
    const user = await createUser('cooldownuser', 'aa@aa.aa');
    let response;
    for (let i = 0; i < getConfig<number>('user.maxLoginAttempts'); i++) {
      response = await app.inject({
        method: 'POST',
        path: '/api/v1/login',
        body: {
          usernameOrEmail: user.username,
          pass: 'wrongpassword',
          loginMethod: 'username',
          agentId: validAgentId,
        },
        ...csrfHeader,
      });
    }
    const body = JSON.parse(response?.body || '') as FastifyError;
    expect(response?.statusCode).toBe(401);
    expect(body.code).toEqual('LOGIN_USER_UNDER_COOLDOWN');
    expect(
      body.message.startsWith('User is under cooldown, login denied (loginAttempts:')
    ).toBeTruthy();
  });

  it('should successfully login with a username and fail if tried again without logging out', async () => {
    const user = await createUser('myusername2', 'bb@bb.bb');
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: user.username,
        pass: user.pass,
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    let body = JSON.parse(response?.body || '') as LoginRoute['Reply'];
    expect(response?.statusCode).toBe(200);
    expect(body).toStrictEqual({ ok: true, requiredActions: null });

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: user.username,
        pass: user.pass,
        loginMethod: 'username',
        agentId: validAgentId,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    body = JSON.parse(response?.body || '') as FastifyError;
    expect(response?.statusCode).toBe(400);
    expect(body.code).toEqual('SESSION_CANNOT_BE_SIGNED_IN');
    expect(body.message).toStrictEqual('Cannot be signed in to access route');
  });

  it('should successfully login with an email and fail if tried again without logging out', async () => {
    const user = await createUser('myusername3', 'cc@cc.cc');
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: user.email,
        pass: user.pass,
        loginMethod: 'email',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    let body = JSON.parse(response?.body || '') as LoginRoute['Reply'];
    expect(response?.statusCode).toBe(200);
    expect(body).toStrictEqual({ ok: true, requiredActions: null });

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: user.email,
        pass: user.pass,
        loginMethod: 'email',
        agentId: validAgentId,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    body = JSON.parse(response?.body || '') as FastifyError;
    expect(response?.statusCode).toBe(400);
    expect(body.code).toEqual('SESSION_CANNOT_BE_SIGNED_IN');
    expect(body.message).toStrictEqual('Cannot be signed in to access route');
  });

  it('should fail a logout if not signed in', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/logout',
      ...csrfHeader,
    });
    const body = JSON.parse(response?.body || '') as FastifyError;
    expect(response?.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toStrictEqual('Must be signed in');
  });

  it('should successfully logout', async () => {
    const user = await createUser('myusername4', 'dd@dd.dd');
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: user.email,
        pass: user.pass,
        loginMethod: 'email',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/logout',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response?.body || '') as LogoutRoute['Reply'];
    expect(response?.statusCode).toBe(200);
    expect(body).toStrictEqual({ ok: true });
  });
});

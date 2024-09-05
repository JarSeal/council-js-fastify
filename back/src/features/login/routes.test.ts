import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import initApp from '../../core/app';
import { SESSION_COOKIE_NAME, getConfig, setCachedSysSettings } from '../../core/config';
import type { Reply } from './schemas';
import type { LogoutRoute } from '../logout/schemas';
import {
  createSysSettings,
  createUser,
  csrfHeader,
  updateSystemSetting,
  validAgentId,
} from '../../test/utils';
import { generate2FACode } from './handlers';

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

  // BASIC LOGIN [START]
  it('should fail without the CSRF header', async () => {
    await createUser('csrfUser', { password: 'csrfPassword' });
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'csrfUser',
        pass: 'csrfPassword',
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
      path: '/api/v1/sys/login',
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body must be object');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: { usernameOrEmail: 'myusername' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'pass'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: { pass: 'myPa$$word1' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'usernameOrEmail'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: { usernameOrEmail: 'myusername', pass: 'myPa$$word1' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'loginMethod'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
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
      path: '/api/v1/sys/login',
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
      path: '/api/v1/sys/login',
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
      path: '/api/v1/sys/login',
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
      path: '/api/v1/sys/login',
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
      path: '/api/v1/sys/login',
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
    await createUser('cooldownuser');
    let response;
    for (let i = 0; i < getConfig<number>('security.maxLoginAttempts'); i++) {
      response = await app.inject({
        method: 'POST',
        path: '/api/v1/sys/login',
        body: {
          usernameOrEmail: 'cooldownuser',
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
    await createUser('myusername2', { verified: true });
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername2',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    const loginBody1 = JSON.parse(response.body) as Reply;
    expect(response?.statusCode).toBe(200);
    expect(loginBody1.ok).toBeTruthy();
    expect(loginBody1.requiredActions).toBe(null);
    expect(loginBody1.publicSettings).toBeTruthy();

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername2',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const loginBody2 = JSON.parse(response.body) as FastifyError;
    expect(response?.statusCode).toBe(400);
    expect(loginBody2.code).toEqual('SESSION_CANNOT_BE_SIGNED_IN');
    expect(loginBody2.message).toStrictEqual('Cannot be signed in to access route');
  });

  it('should successfully login with an email and fail if tried again without logging out', async () => {
    await createUser('myusername3', { email: 'cc@cc.cc', verified: true });
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'cc@cc.cc',
        pass: 'password',
        loginMethod: 'email',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    const loginBody1 = JSON.parse(response.body) as Reply;
    expect(response?.statusCode).toBe(200);
    expect(loginBody1.ok).toBeTruthy();
    expect(loginBody1.requiredActions).toBe(null);
    expect(loginBody1.publicSettings).toBeTruthy();

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'cc@cc.cc',
        pass: 'password',
        loginMethod: 'email',
        agentId: validAgentId,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const loginBody2 = JSON.parse(response.body) as FastifyError;
    expect(response?.statusCode).toBe(400);
    expect(loginBody2.code).toEqual('SESSION_CANNOT_BE_SIGNED_IN');
    expect(loginBody2.message).toStrictEqual('Cannot be signed in to access route');
  });

  it('should fail a logout if not signed in', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/logout',
      body: {},
      ...csrfHeader,
    });
    const body = JSON.parse(response?.body || '') as FastifyError;
    expect(response?.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toStrictEqual('Must be signed in');
  });

  it('should successfully logout', async () => {
    await createUser('myusername4', { email: 'dd@dd.dd', verified: true });
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'dd@dd.dd',
        pass: 'password',
        loginMethod: 'email',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/logout',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response?.body || '') as LogoutRoute['Reply'];
    expect(response?.statusCode).toBe(200);
    expect(body).toStrictEqual({ ok: true });
  });
  // BASIC LOGIN [/END]

  // LOGIN UTILS [START]
  it('generate2FACode', () => {
    const result = generate2FACode();
    expect(result).toHaveLength(6);
    expect(typeof result).toBe('string');
  });
  // LOGIN UTILS [/END]

  // 2FA LOGIN [START]
  it('should fail when no 2FA session is found', async () => {
    await createUser('myusername4', { email: 'dd@dd.dd', verified: true });
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login/2fa',
      body: {
        username: 'myusername4',
        code: '01234',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('LOGIN_2FA_SESSION_EXPIRED_OR_MISSING');
  });

  it('should go to cooldown when too many failed 2FA attempts', async () => {
    await createUser('myusername4', { email: 'dd@dd.dd', verified: true });
    let response;
    for (let i = 0; i < 5; i++) {
      response = await app.inject({
        method: 'POST',
        path: '/api/v1/sys/login/2fa',
        body: {
          username: 'myusername4',
          code: '01234',
          agentId: validAgentId,
        },
        ...csrfHeader,
      });
    }
    if (!response) response = { statusCode: 0, body: '[]' };
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('LOGIN_USER_UNDER_COOLDOWN');
  });

  it('should successfully login with 2FA (and have one wrong code) and then logout', async () => {
    await createSysSettings();
    await updateSystemSetting('use2FA', 'ENABLED');
    await updateSystemSetting('useEmail', true);
    await setCachedSysSettings();
    await createUser('myusername2fa', { email: '2fa@2fa.fa', verified: true });

    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername2fa',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const loginBody = JSON.parse(response.body) as Reply;
    expect(response?.statusCode).toBe(200);
    expect(loginBody.ok).toBeTruthy();
    expect(loginBody.requiredActions).toBe(null);
    expect(loginBody.publicSettings).toBeTruthy();
    expect(loginBody.twoFactorUser).toBe('myusername2fa');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login/2fa',
      body: {
        username: 'myusername2fa',
        code: 'wrong',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const failedLoginBody = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(failedLoginBody.code).toBe('LOGIN_2FA_CODE_WRONG');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login/2fa',
      body: {
        username: 'myusername2fa',
        code: '012345',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = response.cookies.find((c) => c.name === SESSION_COOKIE_NAME);
    const successLoginBody = JSON.parse(response.body) as Reply;
    expect(response?.statusCode).toBe(200);
    expect(successLoginBody.ok).toBeTruthy();
    expect(successLoginBody.requiredActions).toBe(null);
    expect(successLoginBody.publicSettings).toBeTruthy();
    expect(successLoginBody.twoFactorUser).toBe(undefined);

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/logout',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const logoutBody = JSON.parse(response.body) as LogoutRoute['Reply'];
    expect(response?.statusCode).toBe(200);
    expect(logoutBody).toStrictEqual({ ok: true });
  });
  // 2FA LOGIN [/END]
});

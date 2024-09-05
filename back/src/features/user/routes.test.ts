import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';

import initApp from '../../core/app';
import {
  createGroup,
  createPrivilege,
  createSysAdmin,
  createSysSettings,
  createUser,
  csrfHeader,
  updateSystemSetting,
  validAgentId,
} from '../../test/utils';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import type { JustOkReply } from './routes';
import { MAX_FORGOT_PASSWORD_RESENDS, SESSION_COOKIE_NAME } from '../../core/config';

describe('user routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
    await createSysAdmin(true);
    await createSysSettings();
    await updateSystemSetting('useEmail', true);
    const basicUsersGroupId = await createGroup('basicUsers');
    await createPrivilege('form', 'sendVerificationEmail', 'canUseForm', {
      public: 'false',
      requireCsrfHeader: true,
      users: [],
      groups: [basicUsersGroupId],
      excludeUsers: [],
      excludeGroups: [],
    });
    await createPrivilege('form', 'verifyEmail', 'canUseForm', {
      public: 'true',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    await createPrivilege('form', 'forgotPassword', 'canUseForm', {
      public: 'onlyPublic',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    await createPrivilege('form', 'resetPassword', 'canUseForm', {
      public: 'true',
      requireCsrfHeader: true,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  // Verify email route [START]
  it('should fail "verify email" without CSRF header', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email?token=s',
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should fail "verify email" without token in querystring', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email',
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('FST_ERR_VALIDATION');
  });

  it('should fail "verify email" when the token is not found', async () => {
    let response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email?token',
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(404);
    expect(body.code).toBe('TOKEN_NOT_FOUND');

    response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email?token=',
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(404);
    expect(body.code).toBe('TOKEN_NOT_FOUND');

    response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email?token=someinvalidtoken',
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(404);
    expect(body.code).toBe('TOKEN_NOT_FOUND');

    response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email?token=eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJ0b2tlblR5cGUiOiJFTUFJTF9WRVJJRklDQVRJT04iLCJ0b2tlbklkIjoiOTAwYmRmYTgtZDFiYS00NTFkLTk3YjMtMjIzYjRmYWQ1MDQ1IiwiYXVkIjoiQ291bmNpbC1GYXN0aWZ5IHVzZXJzIiwiaXNzIjoiQ291bmNpbC1GYXN0aWZ5Iiwic3ViIjoiU2lnbmVkIENvdW5jaWwtRmFzdGlmeSBVUkwgdG9rZW4iLCJpYXQiOjE3MDc1NjI0MDR9.8dOawm1agZrXtF5MKCVviAEUzDH3ImoQVNNkoKnlWaYojJWI5JUIZCjJylsjx67W6x88zFFkxsQ4mk2NPZuVBw',
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(404);
    expect(body.code).toBe('TOKEN_NOT_FOUND');
  });

  it('should verify email successfully', async () => {
    await updateSystemSetting('forceEmailVerification', true);
    const userId = await createUser('mynewuser', { verified: false });
    let user = await DBUserModel.findById<DBUser>(userId);

    const token = user?.emails[0]?.token?.token || '';

    const response = await app.inject({
      method: 'GET',
      path: `/api/v1/sys/user/verify-email?token=${token}`,
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as JustOkReply;
    expect(body.ok).toBeTruthy();

    user = await DBUserModel.findById<DBUser>(userId);
    expect(user?.emails[0]?.verified).toBeTruthy();
    expect(user?.emails[0]?.token?.token).toBe(null);
    expect(user?.emails[0]?.token?.tokenId).toBe(null);
  });
  // Verify email route [/END]

  // Send verification email route [START]
  it('should fail "Send verification email" without CSRF header', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/send-verification-email/',
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should fail "Send verification email" when the user is not signed in', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/send-verification-email/0',
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should fail "Send verification email" without emailIndex in query params or it is invalid', async () => {
    const basicUsersGroupId = await createGroup('basicUsers');
    await createUser('myusername4', { email: 'dd@dd.dd', groupIds: [basicUsersGroupId] });
    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername4',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    let response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/send-verification-email/',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('FST_ERR_VALIDATION');

    response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/send-verification-email/fsd',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('FST_ERR_VALIDATION');

    response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/send-verification-email/23',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should send verification email successfully', async () => {
    const basicUsersGroupId = await createGroup('basicUsers');
    await createUser('myusername5', { email: 'ee@ee.ee', groupIds: [basicUsersGroupId] });
    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername5',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/send-verification-email/0',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as JustOkReply;
    expect(body.ok).toBeTruthy();
  });
  // Send verification email route [/END]

  // Forgot password route [START]
  it('should fail "Forgot password" without CSRF header', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: {},
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should fail when "Forgot password" feature is turned off', async () => {
    await updateSystemSetting('forgotPassIdMethod', 'DISABLED');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: {},
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(403);
    expect(body.code).toBe('FEATURE_DISABLED');
  });

  it('should fail when "Forgot password" forgotPassIdMethod is EMAIL_ONLY and no email', async () => {
    await updateSystemSetting('forgotPassIdMethod', 'EMAIL_ONLY');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: {},
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should fail when "Forgot password" forgotPassIdMethod is USERNAME_ONLY and no username', async () => {
    await updateSystemSetting('forgotPassIdMethod', 'USERNAME_ONLY');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: {},
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should fail when "Forgot password" forgotPassIdMethod is BOTH_REQUIRED and no email', async () => {
    await updateSystemSetting('forgotPassIdMethod', 'BOTH_REQUIRED');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { username: 'myusername' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should fail when "Forgot password" forgotPassIdMethod is BOTH_REQUIRED and no username', async () => {
    await updateSystemSetting('forgotPassIdMethod', 'BOTH_REQUIRED');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { email: 'email@dd.dd' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should fail when "Forgot password" forgotPassIdMethod is EITHER and no username nor email', async () => {
    await updateSystemSetting('forgotPassIdMethod', 'EITHER');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: {},
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('BAD_REQUEST');
  });

  it('should fail "Forgot password" when email feature is turned off', async () => {
    await updateSystemSetting('useEmail', false);
    await updateSystemSetting('forgotPassIdMethod', 'EITHER');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: {},
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(403);
    expect(body.code).toBe('FEATURE_DISABLED');
  });

  it('should return ok for "Forgot password" with a non-existing username (fails silently)', async () => {
    await updateSystemSetting('useEmail', true);
    await updateSystemSetting('forgotPassIdMethod', 'EITHER');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { username: 'anonexiting' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as JustOkReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
  });

  it('should return ok for "Forgot password" with a non-existing email (fails silently)', async () => {
    await updateSystemSetting('useEmail', true);
    await updateSystemSetting('forgotPassIdMethod', 'EITHER');
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { email: 'anonexiting@email.dd' },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as JustOkReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
  });

  it('should return ok for "Forgot password" when MAX_RESENDS are NOT full', async () => {
    await updateSystemSetting('useEmail', true);
    await updateSystemSetting('forgotPassIdMethod', 'EITHER');
    await createUser('myusername', { verified: true });
    const response1 = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { username: 'myusername' },
      ...csrfHeader,
    });
    const body1 = JSON.parse(response1.body) as JustOkReply;
    expect(response1.statusCode).toBe(200);
    expect(body1.ok).toBeTruthy();

    const newPassToken1 = (await DBUserModel.findOne<DBUser>({ simpleId: 'myusername' }))?.security
      .newPassToken;

    const response2 = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { username: 'myusername' },
      ...csrfHeader,
    });
    const body2 = JSON.parse(response2.body) as JustOkReply;
    expect(response2.statusCode).toBe(200);
    expect(body2.ok).toBeTruthy();

    const newPassToken2 = (await DBUserModel.findOne<DBUser>({ simpleId: 'myusername' }))?.security
      .newPassToken;

    expect(newPassToken1?.token !== newPassToken2?.token).toBeTruthy();
    expect(newPassToken1?.tokenId !== newPassToken2?.tokenId).toBeTruthy();
  });

  it('should return ok for "Forgot password" when MAX_RESENDS are full', async () => {
    await updateSystemSetting('useEmail', true);
    await updateSystemSetting('forgotPassIdMethod', 'EITHER');
    await createUser('myusername', { verified: true });
    let response1;
    for (let i = 0; i < MAX_FORGOT_PASSWORD_RESENDS; i++) {
      response1 = await app.inject({
        method: 'POST',
        path: '/api/v1/sys/user/forgot-password',
        body: { username: 'myusername' },
        ...csrfHeader,
      });
    }
    const body1 = response1 && (JSON.parse(response1.body) as JustOkReply);
    expect(response1?.statusCode).toBe(200);
    expect(body1?.ok).toBeTruthy();

    const newPassToken1 = (await DBUserModel.findOne<DBUser>({ simpleId: 'myusername' }))?.security
      .newPassToken;

    const response2 = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/user/forgot-password',
      body: { username: 'myusername' },
      ...csrfHeader,
    });
    const body2 = JSON.parse(response2.body) as JustOkReply;
    expect(response2.statusCode).toBe(200);
    expect(body2.ok).toBeTruthy();

    const newPassToken2 = (await DBUserModel.findOne<DBUser>({ simpleId: 'myusername' }))?.security
      .newPassToken;

    expect(newPassToken1?.token === newPassToken2?.token).toBeTruthy();
    expect(newPassToken1?.tokenId === newPassToken2?.tokenId).toBeTruthy();
  });
  // Forgot password route [/END]
});

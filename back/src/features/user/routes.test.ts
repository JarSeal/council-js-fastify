import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import {
  createSysAdmin,
  createSysSettings,
  createUser,
  csrfHeader,
  updateSystemSetting,
  validAgentId,
} from '../../test/utils';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import type { JustOkReply } from './routes';
import { SESSION_COOKIE_NAME } from '../../core/config';

describe('user routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
    await createSysAdmin(true);
    await createSysSettings();
    await updateSystemSetting('useEmail', true);
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
    await createUser('myusername4', { email: 'dd@dd.dd' });
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
    await createUser('myusername5', { email: 'ee@ee.ee' });
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

  // should fail without the csrf header
  // should fail when email is turned off
  // should fail when forgot password feature is turned off
  // should fail when forgotPassIdMethod is EMAIL_ONLY and no email
  // should fail when forgotPassIdMethod is USERNAME_ONLY and no username
  // should fail when forgotPassIdMethod is BOTH_REQUIRED and no email
  // should fail when forgotPassIdMethod is BOTH_REQUIRED and no username
  // should fail without email and username
  // should return ok with non-existing username (fails silently)
  // should return ok with non-existing email (fails silently)
  // should return ok with when MAX_RESENDS are NOT full
  // should return ok with when MAX_RESENDS are full
  // should return ok with forgotPassIdMethod is EITHER and proper username is sent
  // should return ok with forgotPassIdMethod is EITHER and proper email is sent

  // Forgot password route [/END]
});

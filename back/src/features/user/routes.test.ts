import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import {
  createSysAdmin,
  createSysSettings,
  createUser,
  csrfHeader,
  updateSystemSetting,
} from '../../test/utils';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import type { VerifyEmailReply } from './routes';

describe('user routes', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
    await createSysAdmin(true);
    await createSysSettings();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should fail without CSRF header', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email?token=s',
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should fail without token in querystring', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/user/verify-email',
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toBe('FST_ERR_VALIDATION');
  });

  it('should fail when the token is not found', async () => {
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
    const body = JSON.parse(response.body) as VerifyEmailReply;
    expect(body.ok).toBeTruthy();

    user = await DBUserModel.findById<DBUser>(userId);
    expect(user?.emails[0]?.verified).toBeTruthy();
    expect(user?.emails[0]?.token?.token).toBe(null);
    expect(user?.emails[0]?.token?.tokenId).toBe(null);
  });
});

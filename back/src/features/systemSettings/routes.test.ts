import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createSysAdmin, createSysSettings, csrfHeader, validAgentId } from '../../test/utils';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { SystemSettingsGetReply } from './routes';

describe('systemSettings', () => {
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

  it('should fail GET without the CSRF header', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'superadmin',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/system-settings',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
    });

    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toEqual('CSRF-header is invalid or missing');
  });

  it('should GET all settings successfully', async () => {
    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'superadmin',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/system-settings',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsGetReply;
    expect(response.statusCode).toBe(200);
    console.log('GETRESULT***********', body);
    // @TODO: add result tests
  });

  // should GET all settings successfully

  // should GET one setting with settingId successfully

  // should GET multiple settings with settingId successfully

  // should GET all settings from one category successfully and also the form

  // should GET all settings from two categories successfully

  // should fail PUT without the CSRF header

  // should fail PUT without proper payload

  // should fail PUT with invalid payload values

  // should successfully PUT and create one settings doc

  // should successfully PUT and create multiple settings docs

  // should successfully PUT and edit one settings doc and get data

  // should successfully PUT and edit multiple settings docs and get data
});

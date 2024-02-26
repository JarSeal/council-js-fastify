import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import {
  createSysAdmin,
  createSysSettings,
  csrfHeader,
  updateSystemSetting,
  validAgentId,
} from '../../test/utils';
import { SESSION_COOKIE_NAME, setCachedSysSettings } from '../../core/config';
import type { SystemSettingsGetReply, SystemSettingsPutReply } from './routes';
import type { FormElem } from '../../dbModels/_modelTypePartials';

describe('systemSettings', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
    await createSysAdmin(true);
    await createSysSettings();
    await updateSystemSetting('use2FA', 'DISABLED');
    await setCachedSysSettings();
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
    expect(body.data[0].elemId).toBe('forceEmailVerification');
    expect(body.data[1].elemId).toBe('use2FA');
    expect(body.data[5].elemId).toBe('useEmail');
  });

  it('should GET one setting with settingId successfully', async () => {
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
      path: '/api/v1/sys/system-settings?settingId=use2FA',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsGetReply;
    expect(response.statusCode).toBe(200);
    expect(body.data).toStrictEqual([
      {
        elemId: 'use2FA',
        value: 'DISABLED',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 0,
      },
    ]);
  });

  it('should GET multiple settings with settingId successfully', async () => {
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
      path: '/api/v1/sys/system-settings?settingId=use2FA&settingId=defaultEditedLogs',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsGetReply;
    expect(response.statusCode).toBe(200);
    expect(body.data).toStrictEqual([
      {
        elemId: 'use2FA',
        value: 'DISABLED',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 0,
      },
      {
        elemId: 'defaultEditedLogs',
        value: 10,
        valueType: 'number',
        category: 'logs',
        edited: [],
        orderNr: 1,
      },
    ]);
  });

  it('should GET all settings from one category successfully and also the form', async () => {
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
      path: '/api/v1/sys/system-settings?category=security&getForm=true',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsGetReply;
    expect(response.statusCode).toBe(200);
    expect(body.data).toStrictEqual([
      {
        elemId: 'forceEmailVerification',
        value: false,
        valueType: 'boolean',
        category: 'security',
        edited: [],
        orderNr: 0,
      },
      {
        elemId: 'use2FA',
        value: 'DISABLED',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 1,
      },
      {
        elemId: 'loginMethod',
        value: 'USERNAME_ONLY',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 2,
      },
      {
        elemId: 'forgotPassIdMethod',
        value: 'USERNAME_ONLY',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 3,
      },
    ]);
    const formElems = body.form?.formElems as FormElem[];
    expect(formElems[0].elemId).toBe('forceEmailVerification');
    expect(formElems[1].elemId).toBe('use2FA');
    expect(formElems[5].elemId).toBe('useEmail');
  });

  it('should GET all settings from two categories successfully', async () => {
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
      path: '/api/v1/sys/system-settings?category=security&category=logs',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsGetReply;
    expect(response.statusCode).toBe(200);
    expect(body.data).toStrictEqual([
      {
        elemId: 'forceEmailVerification',
        value: false,
        valueType: 'boolean',
        category: 'security',
        edited: [],
        orderNr: 0,
      },
      {
        elemId: 'use2FA',
        value: 'DISABLED',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 1,
      },
      {
        elemId: 'defaultEditedLogs',
        value: 10,
        valueType: 'number',
        category: 'logs',
        edited: [],
        orderNr: 2,
      },
      {
        elemId: 'loginMethod',
        value: 'USERNAME_ONLY',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 3,
      },
      {
        elemId: 'forgotPassIdMethod',
        value: 'USERNAME_ONLY',
        valueType: 'string',
        category: 'security',
        edited: [],
        orderNr: 4,
      },
    ]);
  });

  it('should fail PUT without the CSRF header', async () => {
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
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
    });

    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toEqual('CSRF-header is invalid or missing');
  });

  it('should fail PUT without proper payload', async () => {
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
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'data'");
  });

  it('should fail PUT with invalid payload values', async () => {
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
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: { data: [{ elemId: 'tadaa', value: 1 }] },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeFalsy();
    expect(body.error).toStrictEqual({
      errorId: 'elemNotFoundInForm',
      status: 400,
      message:
        "System Setting elemId 'tadaa' was not found in System Settings form. No data was saved.",
    });
  });

  it('should successfully PUT and create one settings doc', async () => {
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
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: { data: [{ elemId: 'use2FA', value: 'ENABLED' }] },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();

    await updateSystemSetting('use2FA', 'DISABLED');
    await setCachedSysSettings();
  });

  it('should successfully PUT and create multiple settings docs', async () => {
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
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {
        data: [
          { elemId: 'use2FA', value: 'ENABLED' },
          { elemId: 'defaultEditedLogs', value: 5 },
        ],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();

    await updateSystemSetting('use2FA', 'DISABLED');
    await setCachedSysSettings();
  });

  it('should successfully PUT and edit one settings doc and get data', async () => {
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

    await app.inject({
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {
        data: [{ elemId: 'defaultEditedLogs', value: 5 }],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const response = await app.inject({
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {
        data: [{ elemId: 'defaultEditedLogs', value: 7 }],
        getData: { settingId: 'defaultEditedLogs' },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
    const elem = body.data?.find((item) => item.elemId === 'defaultEditedLogs');
    expect(elem?.edited).toBeTruthy();
    expect(elem?.value).toBe(7);
  });

  it('should successfully PUT and edit multiple settings docs and get data', async () => {
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

    await app.inject({
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {
        data: [
          { elemId: 'use2FA', value: 'DISABLED' },
          { elemId: 'defaultEditedLogs', value: 5 },
        ],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const response = await app.inject({
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {
        data: [
          { elemId: 'use2FA', value: 'ENABLED' },
          { elemId: 'defaultEditedLogs', value: 7 },
        ],
        getData: { settingId: ['use2FA', 'defaultEditedLogs'] },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
    const elem1 = body.data?.find((item) => item.elemId === 'use2FA');
    expect(elem1?.edited).toBeTruthy();
    expect(elem1?.value).toBe('ENABLED');
    expect(elem1?.valueType).toBe('string');
    const elem2 = body.data?.find((item) => item.elemId === 'defaultEditedLogs');
    expect(elem2?.edited).toBeTruthy();
    expect(elem2?.value).toBe(7);
    expect(elem2?.valueType).toBe('number');
  });
});

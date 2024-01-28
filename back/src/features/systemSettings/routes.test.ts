import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createSysAdmin, createSysSettings, csrfHeader, validAgentId } from '../../test/utils';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { SystemSettingsGetReply, SystemSettingsPutReply } from './routes';

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
        elemId: 'defaultEditedHistoryCount',
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
        elemId: 'userGroupsCacheTime',
        value: 180,
        valueType: 'number',
        category: 'caches',
        edited: [],
        orderNr: 4,
      },
    ]);
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
      path: '/api/v1/sys/system-settings?settingId=use2FA&settingId=defaultEditedHistoryCount',
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
        elemId: 'defaultEditedHistoryCount',
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
    ]);
    expect(body.form).toStrictEqual({
      formTitle: { langKey: 'Form title' },
      formText: { langKey: 'Form text' },
      lockOrder: false,
      formElems: [
        {
          label: { langKey: 'Force E-mail verification' },
          elemId: 'forceEmailVerification',
          orderNr: 0,
          elemType: 'inputCheckbox',
          valueType: 'boolean',
          classes: [],
          elemData: {
            defaultValue: false,
            category: 'security',
            description: {
              langKey:
                "Whether users' must verify their E-mail before being able to use the service or not.",
            },
          },
          doNotSave: false,
          inputErrors: [],
        },
        {
          label: { langKey: 'Use 2-factor authentication' },
          elemId: 'use2FA',
          orderNr: 1,
          elemType: 'inputDropDown',
          valueType: 'string',
          classes: [],
          elemData: {
            defaultValue: 'DISABLED',
            options: [
              { label: { langKey: 'Disabled' }, value: 'DISABLED' },
              { label: { langKey: 'Enabled' }, value: 'ENABLED' },
              { label: { langKey: 'User chooses' }, value: 'USER_CHOOSES' },
              {
                label: { langKey: 'User chooses, set to disabled for all' },
                value: 'USER_CHOOSES_AND_SET_TO_DISABLED',
              },
              {
                label: { langKey: 'User chooses, set to enabled for all' },
                value: 'USER_CHOOSES_AND_SET_TO_ENABLED',
              },
            ],
            category: 'security',
            publicSetting: true,
            description: {
              langKey:
                'Whether to enable 2-factor authentication for all users or not, or whether users can choose to enable 2FA for themselves.',
            },
          },
          doNotSave: false,
          inputErrors: [],
        },
        {
          label: { langKey: 'Default edited history count' },
          elemId: 'defaultEditedHistoryCount',
          orderNr: 2,
          elemType: 'inputNumber',
          valueType: 'number',
          classes: [],
          elemData: {
            defaultValue: 10,
            category: 'logs',
            description: {
              langKey:
                'How many edited logs are logged by default to all edited history arrays (0 - Infinity).',
            },
            minValue: 0,
          },
          doNotSave: false,
          inputErrors: [],
        },
        {
          label: { langKey: 'Login with Username, Email, or Both' },
          elemId: 'loginMethod',
          orderNr: 3,
          elemType: 'inputDropDown',
          valueType: 'string',
          classes: [],
          elemData: {
            defaultValue: 'USERNAME_ONLY',
            options: [
              { label: { langKey: 'Username only' }, value: 'USERNAME_ONLY' },
              { label: { langKey: 'Email only' }, value: 'EMAIL_ONLY' },
              {
                label: { langKey: 'User chooses, Username as default' },
                value: 'USER_CHOOSES_USERNAME_AS_DEFAULT',
              },
              {
                label: { langKey: 'User chooses, Email as default' },
                value: 'USER_CHOOSES_EMAIL_AS_DEFAULT',
              },
            ],
            category: 'security',
            publicSetting: true,
            description: {
              langKey:
                'Whether users are required to login with a Username or Email, or if they can choose the option',
            },
          },
          doNotSave: false,
          inputErrors: [],
        },
        {
          elemId: 'userGroupsCacheTime',
          elemType: 'inputDropDown',
          orderNr: 4,
          valueType: 'number',
          classes: [],
          elemData: {
            defaultValue: 180,
            options: [
              { label: { langKey: '30 seconds' }, value: 30 },
              { label: { langKey: '3 minutes' }, value: 180 },
              { label: { langKey: '10 minutes' }, value: 600 },
            ],
            category: 'caches',
            description: {
              langKey:
                "How long is the cache time for user groups on the user's session. If a user is added/removed to/from a group, it will take this amount of time before the session registers it. Logging out and in again will reset cache.",
            },
          },
          label: { langKey: 'User Groups Session Cache Time' },
          doNotSave: false,
          inputErrors: [],
        },
      ],
      classes: [],
    });
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
        elemId: 'defaultEditedHistoryCount',
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
          { elemId: 'defaultEditedHistoryCount', value: 5 },
        ],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
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
        data: [{ elemId: 'defaultEditedHistoryCount', value: 5 }],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const response = await app.inject({
      method: 'PUT',
      path: '/api/v1/sys/system-settings',
      body: {
        data: [{ elemId: 'defaultEditedHistoryCount', value: 7 }],
        getData: { settingId: 'defaultEditedHistoryCount' },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const body = JSON.parse(response.body) as SystemSettingsPutReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
    const elem = body.data?.find((item) => item.elemId === 'defaultEditedHistoryCount');
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
          { elemId: 'defaultEditedHistoryCount', value: 5 },
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
          { elemId: 'defaultEditedHistoryCount', value: 7 },
        ],
        getData: { settingId: ['use2FA', 'defaultEditedHistoryCount'] },
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
    const elem2 = body.data?.find((item) => item.elemId === 'defaultEditedHistoryCount');
    expect(elem2?.edited).toBeTruthy();
    expect(elem2?.value).toBe(7);
    expect(elem2?.valueType).toBe('number');
  });
});

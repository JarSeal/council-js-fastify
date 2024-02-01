import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createForm, createSysAdmin, createUser, csrfHeader, validAgentId } from '../../test/utils';
import type { FormDataPostReply, FormDataGetReply, FormDataPutAndDeleteReply } from './routes';
import { type PublicPrivilegeProp } from '../../dbModels/_modelTypePartials';
import { SESSION_COOKIE_NAME } from '../../core/config';

describe('DELETE formData', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await initApp();
  });

  afterEach(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should test the formData DELETE route with a non-existing route', async () => {
    const response = await app.inject({
      method: 'DELETE',
      path: '/api/v1/someweirdapi',
      body: {
        dataId: 'all',
      },
    });
    expect(response.statusCode).toBe(404);
  });

  it('should fail when "body" and dataId are missing from the body', async () => {
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      }
    );
    let response = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
    });
    expect(response.statusCode).toBe(400);
    response = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {},
    });
    expect(response.statusCode).toBe(400);
    response = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: { dataId: null },
    });
    expect(response.statusCode).toBe(500);
    response = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: { dataId: 'all' },
    });
    expect(response.statusCode).toBe(404);
  });

  it("should fail when user doesn't have privileges to delete", async () => {
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'false',
            requireCsrfHeader: false,
          },
        },
      }
    );
    const createResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'old string',
          },
          {
            elemId: 'testElem1',
            value: 0,
          },
        ],
      },
    });
    const createBody = JSON.parse(createResponse.body) as FormDataPostReply;

    const response = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
      },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should fail when trying to delete a dataSet and the user does not have privileges to do so', async () => {
    const elemPrivs = {
      public: 'false' as PublicPrivilegeProp,
      requireCsrfHeader: false,
      users: [],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    };
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
          privileges: {
            read: elemPrivs,
            edit: elemPrivs,
          },
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      }
    );

    await createSysAdmin(true);
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

    const result1 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
        privileges: {
          delete: {
            public: 'false',
            requireCsrfHeader: true,
          },
        },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const result2 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
        privileges: {
          delete: {
            public: 'false',
            requireCsrfHeader: true,
          },
        },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(result1.body) as FormDataPostReply;
    const createBody2 = JSON.parse(result2.body) as FormDataPostReply;

    await app.inject({
      method: 'POST',
      path: '/api/v1/sys/logout',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const response1 = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
      },
      ...csrfHeader,
    });
    expect(response1.statusCode).toBe(401);

    const response2 = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: createBody2.dataId,
      },
      ...csrfHeader,
    });
    expect(response2.statusCode).toBe(401);

    const response3 = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
      },
      ...csrfHeader,
    });
    expect(response3.statusCode).toBe(404);

    const response4 = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: 'all',
      },
      ...csrfHeader,
    });
    expect(response4.statusCode).toBe(404);
  });

  it('should delete one formData dataSet', async () => {
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
          required: true,
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          read: {
            public: 'true',
            requireCsrfHeader: false,
          },
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      }
    );

    const createResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 12,
          },
        ],
      },
    });
    const createBody = JSON.parse(createResponse.body) as FormDataPostReply;

    const deleteResponse = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        getData: true,
      },
    });
    const deleteBody = JSON.parse(deleteResponse.body) as FormDataPutAndDeleteReply;
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteBody.ok).toBeTruthy();
    expect(deleteBody.dataId).toBe(createBody.dataId);
    expect(deleteBody.getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      { elemId: 'testElem1', value: 12, orderNr: 1, valueType: 'number' },
    ]);

    const checkDataResponse = await app.inject({
      method: 'GET',
      path: `/api/v1/myform?dataId=${createBody.dataId || 'all'}`,
    });
    const checkDataBody = JSON.parse(checkDataResponse.body) as FormDataGetReply;
    expect(checkDataBody.data).toStrictEqual([]);
  });

  it('should delete two formData dataSet', async () => {
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
          required: true,
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          read: {
            public: 'true',
            requireCsrfHeader: false,
          },
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      }
    );

    const createResponse1 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 12,
          },
        ],
      },
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;
    const createResponse2 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some other string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
      },
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const deleteResponse = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        getData: true,
      },
    });
    const deleteBody = JSON.parse(deleteResponse.body) as FormDataPutAndDeleteReply;
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteBody.ok).toBeTruthy();
    expect(deleteBody.dataId).toStrictEqual([createBody1.dataId, createBody2.dataId]);
    expect(deleteBody.getData?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some string',
          orderNr: 0,
          valueType: 'string',
        },
        { elemId: 'testElem1', value: 12, orderNr: 1, valueType: 'number' },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some other string',
          orderNr: 0,
          valueType: 'string',
        },
        { elemId: 'testElem1', value: 15, orderNr: 1, valueType: 'number' },
      ],
    ]);

    const checkDataResponse = await app.inject({
      method: 'GET',
      path: `/api/v1/myform?dataId=${createBody1.dataId || 'all'}&dataId=${
        createBody2.dataId || 'all'
      }`,
    });
    const checkDataBody = JSON.parse(checkDataResponse.body) as FormDataGetReply;
    expect(checkDataBody.data).toStrictEqual([]);
  });

  it('should delete all formData dataSets for privilege range', async () => {
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
          required: true,
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          read: {
            public: 'true',
            requireCsrfHeader: false,
          },
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      }
    );

    const createResponse1 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 12,
          },
        ],
      },
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;
    const createResponse2 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some other string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
      },
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;
    const createResponse3 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some third string',
          },
          {
            elemId: 'testElem1',
            value: 18,
          },
        ],
      },
    });
    const createBody3 = JSON.parse(createResponse3.body) as FormDataPostReply;

    const deleteResponse = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: 'all',
        getData: true,
      },
    });
    const deleteBody = JSON.parse(deleteResponse.body) as FormDataPutAndDeleteReply;
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteBody.ok).toBeTruthy();
    expect(deleteBody.dataId).toStrictEqual([
      createBody1.dataId,
      createBody2.dataId,
      createBody3.dataId,
    ]);
    expect(deleteBody.getData?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some string',
          orderNr: 0,
          valueType: 'string',
        },
        { elemId: 'testElem1', value: 12, orderNr: 1, valueType: 'number' },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some other string',
          orderNr: 0,
          valueType: 'string',
        },
        { elemId: 'testElem1', value: 15, orderNr: 1, valueType: 'number' },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some third string',
          orderNr: 0,
          valueType: 'string',
        },
        { elemId: 'testElem1', value: 18, orderNr: 1, valueType: 'number' },
      ],
    ]);

    const checkDataResponse = await app.inject({
      method: 'GET',
      path: `/api/v1/myform?dataId=${createBody1.dataId || 'all'}&dataId=${
        createBody2.dataId || 'all'
      }&dataId=${createBody3.dataId || 'all'}`,
    });
    const checkDataBody = JSON.parse(checkDataResponse.body) as FormDataGetReply;
    expect(checkDataBody.data).toStrictEqual([]);
  });

  it('should be able to delete as the owner of the form', async () => {
    const userId = await createUser('myusername', { verified: true });
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
          required: true,
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          read: {
            public: 'true',
            requireCsrfHeader: false,
          },
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'false',
            requireCsrfHeader: false,
          },
        },
        owner: userId,
      }
    );

    const createResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 12,
          },
        ],
      },
    });
    const createBody = JSON.parse(createResponse.body) as FormDataPostReply;

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        getData: true,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const deleteBody = JSON.parse(deleteResponse.body) as FormDataPutAndDeleteReply;
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteBody.ok).toBeTruthy();
    expect(deleteBody.dataId).toBe(createBody.dataId);
    expect(deleteBody.getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      { elemId: 'testElem1', value: 12, orderNr: 1, valueType: 'number' },
    ]);

    const checkDataResponse = await app.inject({
      method: 'GET',
      path: `/api/v1/myform?dataId=${createBody.dataId || 'all'}`,
    });
    const checkDataBody = JSON.parse(checkDataResponse.body) as FormDataGetReply;
    expect(checkDataBody.data).toStrictEqual([]);
  });

  it('should be able to delete as the owner of the formData dataSet', async () => {
    const userId = await createUser('myusername', { verified: true });
    await createForm(
      'myform',
      '/myform',
      [
        {
          elemId: 'testElem0',
          orderNr: 0,
          elemType: 'inputText',
          valueType: 'string',
          required: true,
        },
        {
          elemId: 'testElem1',
          orderNr: 1,
          elemType: 'inputNumber',
          valueType: 'number',
        },
      ],
      [
        {
          priCategoryId: 'form',
          priTargetId: 'myform',
          priAccessId: 'canUseForm',
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      ],
      {
        formDataDefaultPrivileges: {
          read: {
            public: 'true',
            requireCsrfHeader: false,
          },
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          delete: {
            public: 'false',
            requireCsrfHeader: false,
          },
        },
      }
    );

    await createSysAdmin(true);
    const loginSysAdminResponse = await app.inject({
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
    const sysAdminSessionCookie = loginSysAdminResponse.cookies.find(
      (c) => c.name === SESSION_COOKIE_NAME
    );

    const createResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string',
          },
          {
            elemId: 'testElem1',
            value: 12,
          },
        ],
        owner: userId,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sysAdminSessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody = JSON.parse(createResponse.body) as FormDataPostReply;

    await app.inject({
      method: 'POST',
      path: '/api/v1/sys/logout',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sysAdminSessionCookie?.value) },
      ...csrfHeader,
    });

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const deleteResponse = await app.inject({
      method: 'DELETE',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        getData: true,
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const deleteBody = JSON.parse(deleteResponse.body) as FormDataPutAndDeleteReply;
    expect(deleteResponse.statusCode).toBe(200);
    expect(deleteBody.ok).toBeTruthy();
    expect(deleteBody.dataId).toBe(createBody.dataId);
    expect(deleteBody.getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      { elemId: 'testElem1', value: 12, orderNr: 1, valueType: 'number' },
    ]);

    const checkDataResponse = await app.inject({
      method: 'GET',
      path: `/api/v1/myform?dataId=${createBody.dataId || 'all'}`,
    });
    const checkDataBody = JSON.parse(checkDataResponse.body) as FormDataGetReply;
    expect(checkDataBody.data).toStrictEqual([]);
  });
});

import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createForm, createSysAdmin, csrfHeader, validAgentId } from '../../test/utils';
import type { PublicPrivilegeProp } from '../../dbModels/_modelTypePartials';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { FormDataPostReply, FormDataPutReply } from './routes';

describe('PUT formData', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await initApp();
  });

  afterEach(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should test the formData PUT route with a non-existing route', async () => {
    const response = await app.inject({
      method: 'PUT',
      path: '/api/v1/someweirdapi',
      body: {
        dataId: 'all',
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
    expect(response.statusCode).toBe(404);
  });

  it('should fail when "body", "formData" array, and dataId is missing from the body', async () => {
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
      method: 'PUT',
      path: '/api/v1/myform',
    });
    expect(response.statusCode).toBe(500);
    response = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {},
    });
    expect(response.statusCode).toBe(500);
    response = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: { formData: [] },
    });
    expect(response.statusCode).toBe(500);
    response = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: { dataId: 'all', formData: [] },
    });
    expect(response.statusCode).toBe(404);
  });

  it("should fail when user doesn't have privileges to edit", async () => {
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
          edit: {
            public: 'false',
            requireCsrfHeader: false,
          },
        },
      }
    );
    await app.inject({
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
    const response = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: 'all',
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
    expect(response.statusCode).toBe(404);
  });

  it('should fail when trying to save elem data that the user does not have (elem) privileges to do so', async () => {
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
            create: elemPrivs,
            read: elemPrivs,
            edit: elemPrivs,
            delete: elemPrivs,
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
          edit: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      }
    );

    await createSysAdmin(true);
    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
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
          edit: {
            public: 'true',
            requireCsrfHeader: false,
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
      path: '/api/v1/logout',
      body: {},
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });

    const response1 = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'new string',
          },
          {
            elemId: 'testElem1',
            value: 151,
          },
        ],
      },
      ...csrfHeader,
    });
    expect(response1.statusCode).toBe(401);

    const response2 = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody2.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'new string',
          },
          {
            elemId: 'testElem1',
            value: 151,
          },
        ],
      },
      ...csrfHeader,
    });
    expect(response2.statusCode).toBe(401);

    const response3 = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'new string',
          },
          {
            elemId: 'testElem1',
            value: 151,
          },
        ],
      },
      ...csrfHeader,
    });
    expect(response3.statusCode).toBe(401);

    const response4 = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: 'all',
        formData: [
          {
            elemId: 'testElem0',
            value: 'new string',
          },
          {
            elemId: 'testElem1',
            value: 151,
          },
        ],
      },
      ...csrfHeader,
    });
    expect(response4.statusCode).toBe(401);
  });

  it('should fail when validation for formData values fails', async () => {
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
          edit: {
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
            value: 15,
          },
          {
            elemId: 'testElem1',
            value: 'some string',
          },
        ],
      },
    });
    const createBody = JSON.parse(createResponse.body) as FormDataPostReply;

    const editResponse1 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 15,
          },
          {
            elemId: 'testElem1',
            value: 'some string',
          },
        ],
      },
    });
    const editBody1 = JSON.parse(editResponse1.body) as FormDataPutReply;
    expect(editResponse1.statusCode).toBe(400);
    expect(editBody1.ok).toBeFalsy();
    expect(editBody1.error?.errorId).toBe('invalidValueType');

    const editResponse2 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        dataId: 'all',
        formData: [
          {
            elemId: 'testElem0',
            value: 15,
          },
          {
            elemId: 'testElem1',
            value: 'some string',
          },
        ],
      },
    });
    const editBody2 = JSON.parse(editResponse2.body) as FormDataPutReply;
    expect(editResponse2.statusCode).toBe(400);
    expect(editBody2.ok).toBeFalsy();
    expect(editBody2.error?.errorId).toBe('invalidValueType');
  });

  it('should edit partial formData', async () => {
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
          read: {
            public: 'true',
            requireCsrfHeader: false,
          },
          create: {
            public: 'true',
            requireCsrfHeader: false,
          },
          edit: {
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
        ],
      },
    });
    const createBody = JSON.parse(createResponse.body) as FormDataPostReply;

    const response1 = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
        ],
        getData: true,
      },
    });
    const body1 = JSON.parse(response1.body) as FormDataPutReply;
    expect(response1.statusCode).toBe(200);
    expect(body1.ok).toBeTruthy();
    expect(body1.dataId).toBe(createBody.dataId);
    expect(body1.getData?.data).toStrictEqual([
      { elemId: 'testElem0', orderNr: 0, value: 'some modified string', valueType: 'string' },
    ]);

    const response2 = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        formData: [
          {
            elemId: 'testElem1',
            value: 877,
          },
        ],
        getData: true,
      },
    });
    const body2 = JSON.parse(response2.body) as FormDataPutReply;
    expect(response2.statusCode).toBe(200);
    expect(body2.ok).toBeTruthy();
    expect(body2.dataId).toBe(createBody.dataId);
    expect(body2.getData?.data).toStrictEqual([
      { elemId: 'testElem0', value: 'some modified string', orderNr: 0, valueType: 'string' },
      { elemId: 'testElem1', value: 877, orderNr: 1, valueType: 'number' },
    ]);
  });

  it('should edit full formData', async () => {
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
          edit: {
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

    const editResponse = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 10,
          },
        ],
        getData: true,
      },
    });
    const editBody = JSON.parse(editResponse.body) as FormDataPutReply;
    expect(editResponse.statusCode).toBe(200);
    expect(editBody.ok).toBeTruthy();
    expect(editBody.dataId).toBe(createBody.dataId);
    expect(editBody.getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      { elemId: 'testElem1', value: 10, orderNr: 1, valueType: 'number' },
    ]);
  });

  // Edit privileges fail
  // Edit privielges success
  // Edit canChangePrivileges fail
  // Edit canChangePrivileges success
  // Edit owner "fail" (silent)
  // Edit owner success
});

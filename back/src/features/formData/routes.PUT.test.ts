import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createForm, createSysAdmin, createUser, csrfHeader, validAgentId } from '../../test/utils';
import type {
  BasicPrivilegeProps,
  FormDataPrivileges,
  PublicPrivilegeProp,
  UserId,
} from '../../dbModels/_modelTypePartials';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { FormDataGetReply, FormDataPostReply, FormDataPutAndDeleteReply } from './routes';

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
    const editBody1 = JSON.parse(editResponse1.body) as FormDataPutAndDeleteReply;
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
    const editBody2 = JSON.parse(editResponse2.body) as FormDataPutAndDeleteReply;
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
    const body1 = JSON.parse(response1.body) as FormDataPutAndDeleteReply;
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
    const body2 = JSON.parse(response2.body) as FormDataPutAndDeleteReply;
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
    const editBody = JSON.parse(editResponse.body) as FormDataPutAndDeleteReply;
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

  it('should fail when trying to edit privileges and the user does not have privileges to do so', async () => {
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

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
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
        privileges: {
          edit: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      },
    });
    const bodySingle = JSON.parse(responseSingle.body) as FastifyError;
    expect(responseSingle.statusCode).toBe(401);
    expect(bodySingle.code).toBe('UNAUTHORIZED');

    const createResponse2 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string 2',
          },
          {
            elemId: 'testElem1',
            value: 16,
          },
        ],
      },
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
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
        privileges: {
          edit: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      },
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FastifyError;
    expect(responseMulti.statusCode).toBe(401);
    expect(bodyMulti.code).toBe('UNAUTHORIZED');
  });

  it('should be able to edit privileges successfully when user in canEditPrivileges', async () => {
    const userId = await createUser('myusername');
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
        canEditPrivileges: {
          users: [userId],
        },
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FormDataPutAndDeleteReply;
    expect(responseSingle.statusCode).toBe(200);
    const privileges1 = bodySingle.getData?.$dataPrivileges as FormDataPrivileges;
    expect(privileges1.read?.public).toBe('true');
    expect(privileges1.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges1.delete?.public).toBe('true');
    expect(privileges1.delete?.requireCsrfHeader).toBeFalsy();
    const getData1 = bodySingle.getData as FormDataGetReply;
    expect(getData1?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 15,
        orderNr: 1,
        valueType: 'number',
        privileges: {
          edit: {
            users: [{ id: userId.toString(), simpleId: 'myusername' }],
          },
        },
      },
    ]);

    const createResponse2 = await app.inject({
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
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FormDataPutAndDeleteReply;
    expect(responseMulti.statusCode).toBe(200);
    const privileges2 = bodyMulti.getData?.$dataPrivileges as FormDataPrivileges[];
    expect(privileges2[0].read?.public).toBe('true');
    expect(privileges2[0].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[0].delete?.public).toBe('true');
    expect(privileges2[0].delete?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].read?.public).toBe('true');
    expect(privileges2[1].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].delete?.public).toBe('true');
    expect(privileges2[1].delete?.requireCsrfHeader).toBeFalsy();
    const getData2 = bodyMulti.getData as FormDataGetReply;
    expect(getData2?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
          privileges: {
            edit: {
              users: [{ id: userId.toString(), simpleId: 'myusername' }],
            },
          },
        },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
          privileges: {
            edit: {
              users: [{ id: userId.toString(), simpleId: 'myusername' }],
            },
          },
        },
      ],
    ]);
  });

  it('should be able to edit privileges successfully when user is the owner', async () => {
    const userId = await createUser('myusername');
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
        owner: userId,
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FormDataPutAndDeleteReply;
    expect(responseSingle.statusCode).toBe(200);
    const privileges1 = bodySingle.getData?.$dataPrivileges as FormDataPrivileges;
    expect(privileges1.read?.public).toBe('true');
    expect(privileges1.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges1.delete?.public).toBe('true');
    expect(privileges1.delete?.requireCsrfHeader).toBeFalsy();
    const getData1 = bodySingle.getData as FormDataGetReply;
    expect(getData1?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 15,
        orderNr: 1,
        valueType: 'number',
        privileges: {
          edit: {
            users: [{ id: userId.toString(), simpleId: 'myusername' }],
          },
        },
      },
    ]);

    const createResponse2 = await app.inject({
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
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FormDataPutAndDeleteReply;
    expect(responseMulti.statusCode).toBe(200);
    const privileges2 = bodyMulti.getData?.$dataPrivileges as FormDataPrivileges[];
    expect(privileges2[0].read?.public).toBe('true');
    expect(privileges2[0].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[0].delete?.public).toBe('true');
    expect(privileges2[0].delete?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].read?.public).toBe('true');
    expect(privileges2[1].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].delete?.public).toBe('true');
    expect(privileges2[1].delete?.requireCsrfHeader).toBeFalsy();
    const getData2 = bodyMulti.getData as FormDataGetReply;
    expect(getData2?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
          privileges: {
            edit: {
              users: [{ id: userId.toString(), simpleId: 'myusername' }],
            },
          },
        },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
          privileges: {
            edit: {
              users: [{ id: userId.toString(), simpleId: 'myusername' }],
            },
          },
        },
      ],
    ]);
  });

  it('should fail when trying to edit canEditPrivileges and the user does not have privileges to do so', async () => {
    const userId = await createUser('myusername');
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
        canEditPrivileges: {
          users: [userId],
        },
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
        getData: { includePrivileges: true },
        canEditPrivileges: { users: [] },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FastifyError;
    expect(responseSingle.statusCode).toBe(401);
    expect(bodySingle.code).toBe('UNAUTHORIZED');

    const createResponse2 = await app.inject({
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
        getData: { includePrivileges: true },
        canEditPrivileges: { users: [] },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FastifyError;
    expect(responseMulti.statusCode).toBe(401);
    expect(bodyMulti.code).toBe('UNAUTHORIZED');
  });

  it("should be able to edit canEditPrivileges successfully when user in form's canEditPrivileges", async () => {
    const userId = await createUser('myusername');
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
        canEditPrivileges: {
          users: [userId],
        },
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
        getData: { includePrivileges: true },
        canEditPrivileges: { users: [userId] },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FormDataPutAndDeleteReply;
    expect(responseSingle.statusCode).toBe(200);
    const privileges1 = bodySingle.getData?.$dataPrivileges as FormDataPrivileges;
    expect(privileges1.read?.public).toBe('true');
    expect(privileges1.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges1.delete?.public).toBe('true');
    expect(privileges1.delete?.requireCsrfHeader).toBeFalsy();
    const getData1 = bodySingle.getData as FormDataGetReply;
    expect(getData1?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 15,
        orderNr: 1,
        valueType: 'number',
        privileges: {
          edit: {
            users: [{ id: userId.toString(), simpleId: 'myusername' }],
          },
        },
      },
    ]);

    const createResponse2 = await app.inject({
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
        getData: { includePrivileges: true },
        canEditPrivileges: { users: [userId] },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          delete: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FormDataPutAndDeleteReply;
    expect(responseMulti.statusCode).toBe(200);
    const privileges2 = bodyMulti.getData?.$dataPrivileges as FormDataPrivileges[];
    expect(privileges2[0].read?.public).toBe('true');
    expect(privileges2[0].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[0].delete?.public).toBe('true');
    expect(privileges2[0].delete?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].read?.public).toBe('true');
    expect(privileges2[1].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].delete?.public).toBe('true');
    expect(privileges2[1].delete?.requireCsrfHeader).toBeFalsy();
    const getData2 = bodyMulti.getData as FormDataGetReply;
    expect(getData2?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
          privileges: {
            edit: {
              users: [{ id: userId.toString(), simpleId: 'myusername' }],
            },
          },
        },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
          privileges: {
            edit: {
              users: [{ id: userId.toString(), simpleId: 'myusername' }],
            },
          },
        },
      ],
    ]);
  });

  it('should fail when trying to edit canEditPrivileges and the user does not have privileges to do so', async () => {
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

    const userId = await createUser('myusername');

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

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
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
        canEditPrivileges: {
          users: [userId],
        },
      },
    });

    const bodySingle = JSON.parse(responseSingle.body) as FastifyError;
    expect(responseSingle.statusCode).toBe(401);
    expect(bodySingle.code).toBe('UNAUTHORIZED');

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

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody2.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
          },
        ],
        canEditPrivileges: {
          users: [userId],
        },
      },
    });

    const bodyMulti = JSON.parse(responseMulti.body) as FastifyError;
    expect(responseMulti.statusCode).toBe(401);
    expect(bodyMulti.code).toBe('UNAUTHORIZED');
  });

  it("should be able to edit canEditPrivileges successfully when user in form's canEditPrivileges", async () => {
    const userId = await createUser('myusername');
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
        canEditPrivileges: {
          users: [userId],
        },
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

    const userId2 = await createUser('someotherusername');

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
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
        canEditPrivileges: { users: [userId, userId2] },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FormDataPutAndDeleteReply;
    expect(responseSingle.statusCode).toBe(200);
    const privileges1 = bodySingle.getData?.$dataPrivileges as FormDataPrivileges & {
      canEditPrivileges: BasicPrivilegeProps;
    };
    expect(privileges1.read?.public).toBe('true');
    expect(privileges1.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges1.canEditPrivileges).toStrictEqual({
      users: [userId.toString(), userId2.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    const getData1 = bodySingle.getData as FormDataGetReply;
    expect(getData1?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 15,
        orderNr: 1,
        valueType: 'number',
      },
    ]);

    const createResponse2 = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some otherstring',
          },
          {
            elemId: 'testElem1',
            value: 18,
          },
        ],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
        canEditPrivileges: { users: [userId, userId2] },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FormDataPutAndDeleteReply;
    expect(responseMulti.statusCode).toBe(200);
    const privileges2 = bodyMulti.getData?.$dataPrivileges as (FormDataPrivileges & {
      canEditPrivileges: BasicPrivilegeProps;
    })[];
    expect(privileges2[0].read?.public).toBe('true');
    expect(privileges2[0].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[0].canEditPrivileges).toStrictEqual({
      users: [userId.toString(), userId2.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    expect(privileges2[1].read?.public).toBe('true');
    expect(privileges2[1].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[1].canEditPrivileges).toStrictEqual({
      users: [userId.toString(), userId2.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    const getData2 = bodyMulti.getData as FormDataGetReply;
    expect(getData2?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 15,
          orderNr: 1,
          valueType: 'number',
        },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 15,
          orderNr: 1,
          valueType: 'number',
        },
      ],
    ]);
  });

  it('should be able to edit canEditPrivileges successfully when user is the owner', async () => {
    const userId = await createUser('myusername');
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
        owner: userId,
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
        canEditPrivileges: { users: [userId.toString()] },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FormDataPutAndDeleteReply;
    expect(responseSingle.statusCode).toBe(200);
    const privileges1 = bodySingle.getData?.$dataPrivileges as FormDataPrivileges & {
      canEditPrivileges: BasicPrivilegeProps;
    };
    expect(privileges1.read?.public).toBe('true');
    expect(privileges1.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges1.canEditPrivileges).toStrictEqual({
      users: [userId.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    const getData1 = bodySingle.getData as FormDataGetReply;
    expect(getData1?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 15,
        orderNr: 1,
        valueType: 'number',
      },
    ]);

    const createResponse2 = await app.inject({
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
            value: 18,
          },
        ],
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
          },
        ],
        canEditPrivileges: { users: [userId.toString()] },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FormDataPutAndDeleteReply;
    expect(responseMulti.statusCode).toBe(200);
    const privileges2 = bodyMulti.getData?.$dataPrivileges as (FormDataPrivileges & {
      canEditPrivileges: BasicPrivilegeProps;
    })[];
    expect(privileges2[0].read?.public).toBe('true');
    expect(privileges2[0].read?.requireCsrfHeader).toBeFalsy();
    expect(privileges2[0].canEditPrivileges).toStrictEqual({
      users: [userId.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    const getData2 = bodyMulti.getData as FormDataGetReply;
    expect(getData2?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
        },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
        },
      ],
    ]);
  });

  it('should fail to edit owner', async () => {
    const userId = await createUser('myusername');
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

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
        owner: userId.toString(),
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FastifyError;
    expect(responseSingle.statusCode).toBe(401);
    expect(bodySingle.code).toBe('UNAUTHORIZED');

    const createResponse2 = await app.inject({
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
            value: 2,
          },
        ],
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
          },
        ],
        owner: userId.toString(),
        getData: { includeMeta: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FastifyError;
    expect(responseMulti.statusCode).toBe(401);
    expect(bodyMulti.code).toBe('UNAUTHORIZED');
  });

  it('should be able to edit owner successfully', async () => {
    const userId = await createUser('myusername');
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
        owner: userId,
      }
    );

    const loginResponse = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'password',
        loginMethod: 'username',
        agentId: validAgentId,
      },
      ...csrfHeader,
    });
    const sessionCookie = loginResponse.cookies.find((c) => c.name === SESSION_COOKIE_NAME);

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
        owner: userId.toString(),
        getData: { includeMeta: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody1 = JSON.parse(createResponse1.body) as FormDataPostReply;

    const responseSingle = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: createBody1.dataId,
        formData: [
          {
            elemId: 'testElem0',
            value: 'some modified string',
          },
          {
            elemId: 'testElem1',
            value: 18,
          },
        ],
        owner: userId.toString(),
        getData: { includeMeta: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodySingle = JSON.parse(responseSingle.body) as FormDataPutAndDeleteReply;

    expect(responseSingle.statusCode).toBe(200);
    const getData1 = bodySingle.getData as FormDataGetReply;
    expect(getData1?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some modified string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 18,
        orderNr: 1,
        valueType: 'number',
      },
    ]);
    const metaDataArray1 = getData1?.$dataMetaData as {
      created: Date;
      edited: Date | null;
      owner?: UserId;
      createdBy?: UserId;
      editedBy?: UserId;
    }[];
    const metaData1 = metaDataArray1[0] || {};
    expect(Object.keys(metaData1)).toHaveLength(5);
    expect(metaData1.owner).toBe('myusername');

    const createResponse2 = await app.inject({
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
        owner: userId.toString(),
        getData: { includeMeta: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const createBody2 = JSON.parse(createResponse2.body) as FormDataPostReply;

    const responseMulti = await app.inject({
      method: 'PUT',
      path: '/api/v1/myform',
      body: {
        dataId: [createBody1.dataId, createBody2.dataId],
        formData: [
          {
            elemId: 'testElem0',
            value: 'some multi-modified string',
          },
          {
            elemId: 'testElem1',
            value: 21,
          },
        ],
        owner: userId.toString(),
        getData: { includeMeta: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const bodyMulti = JSON.parse(responseMulti.body) as FormDataPutAndDeleteReply;

    expect(responseMulti.statusCode).toBe(200);
    const getData2 = bodyMulti.getData as FormDataGetReply;
    expect(getData2?.data).toStrictEqual([
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
        },
      ],
      [
        {
          elemId: 'testElem0',
          value: 'some multi-modified string',
          orderNr: 0,
          valueType: 'string',
        },
        {
          elemId: 'testElem1',
          value: 21,
          orderNr: 1,
          valueType: 'number',
        },
      ],
    ]);
    const metaDataArray2 = getData2?.$dataMetaData as {
      created: Date;
      edited: Date | null;
      owner?: UserId;
      createdBy?: UserId;
      editedBy?: UserId;
    }[];
    const metaData2 = metaDataArray2[0] || {};
    expect(Object.keys(metaData2)).toHaveLength(5);
    expect(metaData2.owner).toBe('myusername');
  });
});

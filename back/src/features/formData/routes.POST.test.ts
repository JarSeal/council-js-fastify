import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createForm, createUser, csrfHeader, validAgentId } from '../../test/utils';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { FormDataGetReply, FormDataPostReply } from './routes';
import type {
  BasicPrivilegeProps,
  FormDataPrivileges,
  PublicPrivilegeProp,
  UserId,
} from '../../dbModels/_modelTypePartials';

describe('POST formData', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await initApp();
  });

  afterEach(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should test the formData POST route with a non-existing route', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/someweirdapi',
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
    expect(response.statusCode).toBe(404);
  });

  it('should fail when "body", "formData" array, and data is missing from the body', async () => {
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
      method: 'POST',
      path: '/api/v1/myform',
    });
    expect(response.statusCode).toBe(500);
    response = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: {},
    });
    expect(response.statusCode).toBe(500);
    response = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      body: { formData: [] },
    });
    expect(response.statusCode).toBe(400);
  });

  it("should fail when user doesn't have privileges to create", async () => {
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
            public: 'false',
            requireCsrfHeader: false,
          },
        },
      }
    );
    const response = await app.inject({
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
    expect(response.statusCode).toBe(401);
  });

  it('should fail when maxDataCreatorDocs exceeds', async () => {
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
        maxDataCreatorDocs: 1,
      }
    );

    await createUser('myusername', { verified: true });
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

    await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string 1',
          },
          {
            elemId: 'testElem1',
            value: 12,
          },
        ],
      },
    });
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/myform',
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      body: {
        formData: [
          {
            elemId: 'testElem0',
            value: 'some string 2',
          },
          {
            elemId: 'testElem1',
            value: 15,
          },
        ],
      },
    });
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(403);
    expect(body.ok).toBeFalsy();
    expect(body.error?.errorId).toBe('maxDataCreatorDocs');
  });

  it('should fail when trying to save elem data that the user does not have privileges to do so', async () => {
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
        },
        maxDataCreatorDocs: 1,
      }
    );

    const response = await app.inject({
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
    });
    expect(response.statusCode).toBe(401);
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
        },
        maxDataCreatorDocs: 1,
      }
    );

    const response = await app.inject({
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
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(400);
    expect(body.ok).toBeFalsy();
    expect(body.error?.errorId).toBe('invalidValueType');
  });

  it('should save partial formData', async () => {
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
        },
        maxDataCreatorDocs: 1,
      }
    );

    const response = await app.inject({
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
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
  });

  it('should save full formData', async () => {
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
        },
        maxDataCreatorDocs: 1,
      }
    );

    const response = await app.inject({
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
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    expect(body.ok).toBeTruthy();
  });

  it('should fail when trying to add privileges and the user does not have privileges to do so', async () => {
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
        },
      }
    );

    const response = await app.inject({
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
        privileges: {
          edit: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
      },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should be able to add privileges successfully when user in canEditPrivileges', async () => {
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

    const response = await app.inject({
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
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          edit: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    const privileges = body.getData?.$dataPrivileges as FormDataPrivileges;
    expect(privileges.read?.public).toBe('true');
    expect(privileges.read?.requireCsrfHeader).toBeFalsy();
    const getData = body.getData as FormDataGetReply;
    expect(getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 12,
        orderNr: 1,
        valueType: 'number',
        privileges: {
          edit: {
            users: [{ id: userId.toString(), simpleId: 'myusername' }],
          },
        },
      },
    ]);
  });

  it('should be able to add privileges successfully when user is the owner', async () => {
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

    const response = await app.inject({
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
            privileges: {
              edit: {
                users: [userId],
              },
            },
          },
        ],
        privileges: {
          edit: {
            public: 'true',
            requireCsrfHeader: false,
          },
        },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    const privileges = body.getData?.$dataPrivileges as FormDataPrivileges;
    expect(privileges.read?.public).toBe('true');
    expect(privileges.read?.requireCsrfHeader).toBeFalsy();
    const getData = body.getData as FormDataGetReply;
    expect(getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 12,
        orderNr: 1,
        valueType: 'number',
        privileges: {
          edit: {
            users: [{ id: userId.toString(), simpleId: 'myusername' }],
          },
        },
      },
    ]);
  });

  it('should fail when trying to add canEditPrivileges and the user does not have privileges to do so', async () => {
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
        },
      }
    );

    const userId = await createUser('myusername');
    const response = await app.inject({
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
        canEditPrivileges: {
          users: [userId],
        },
      },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it("should be able to add canEditPrivileges successfully when user in form's canEditPrivileges", async () => {
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
    const response = await app.inject({
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
        canEditPrivileges: { users: [userId, userId2] },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    const privileges = body.getData?.$dataPrivileges as FormDataPrivileges & {
      canEditPrivileges: BasicPrivilegeProps;
    };
    expect(privileges.read?.public).toBe('true');
    expect(privileges.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges.canEditPrivileges).toStrictEqual({
      users: [userId.toString(), userId2.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    const getData = body.getData as FormDataGetReply;
    expect(getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 12,
        orderNr: 1,
        valueType: 'number',
      },
    ]);
  });

  it('should be able to add canEditPrivileges successfully when user is the owner', async () => {
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

    const response = await app.inject({
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
        canEditPrivileges: { users: [userId.toString()] },
        getData: { includePrivileges: true },
      },
      cookies: { [SESSION_COOKIE_NAME]: String(sessionCookie?.value) },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    const privileges = body.getData?.$dataPrivileges as FormDataPrivileges & {
      canEditPrivileges: BasicPrivilegeProps;
    };
    expect(privileges.read?.public).toBe('true');
    expect(privileges.read?.requireCsrfHeader).toBeFalsy();
    expect(privileges.canEditPrivileges).toStrictEqual({
      users: [userId.toString()],
      groups: [],
      excludeUsers: [],
      excludeGroups: [],
    });
    const getData = body.getData as FormDataGetReply;
    expect(getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 12,
        orderNr: 1,
        valueType: 'number',
      },
    ]);
  });

  it('should not be able to change owner and should fail only by not adding the owner (silently)', async () => {
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

    const response = await app.inject({
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
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toBe('UNAUTHORIZED');
  });

  it('should be able to add owner successfully', async () => {
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

    const response = await app.inject({
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
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    const getData = body.getData as FormDataGetReply;
    expect(getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 12,
        orderNr: 1,
        valueType: 'number',
      },
    ]);
    const metaDataArray = getData?.$dataMetaData as {
      created: Date;
      edited: Date | null;
      owner?: UserId;
      createdBy?: UserId;
      editedBy?: UserId;
    }[];
    const metaData = metaDataArray[0] || {};
    expect(Object.keys(metaData)).toHaveLength(5);
    expect(metaData.owner).toBe('myusername');
  });

  it('should be able to add form filler to privileges successfully', async () => {
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
        },
        owner: userId,
        addFillerToPrivileges: ['$read.users', '$delete.excludeUsers', 'testElem1.edit.users'],
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

    const response = await app.inject({
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
    const body = JSON.parse(response.body) as FormDataPostReply;
    expect(response.statusCode).toBe(200);
    const getData = body.getData as FormDataGetReply;
    expect(getData?.data).toStrictEqual([
      {
        elemId: 'testElem0',
        value: 'some string',
        orderNr: 0,
        valueType: 'string',
      },
      {
        elemId: 'testElem1',
        value: 12,
        orderNr: 1,
        valueType: 'number',
        privileges: {
          edit: {
            users: [{ id: userId.toString(), simpleId: 'myusername' }],
          },
        },
      },
    ]);
    const dataPrivileges = getData.$dataPrivileges;
    expect(dataPrivileges).toStrictEqual({
      read: {
        public: 'true',
        requireCsrfHeader: false,
        users: [{ id: userId.toString(), simpleId: 'myusername' }],
        groups: [],
        excludeUsers: [],
        excludeGroups: [],
      },
      create: {
        public: 'true',
        requireCsrfHeader: false,
        users: [],
        groups: [],
        excludeUsers: [],
        excludeGroups: [],
      },
      edit: {
        public: 'false',
        requireCsrfHeader: true,
        users: [],
        groups: [],
        excludeUsers: [],
        excludeGroups: [],
      },
      delete: {
        public: 'false',
        requireCsrfHeader: true,
        users: [],
        groups: [],
        excludeUsers: [{ id: userId.toString(), simpleId: 'myusername' }],
        excludeGroups: [],
      },
      canEditPrivileges: { users: [], groups: [], excludeUsers: [], excludeGroups: [] },
    });
  });
});

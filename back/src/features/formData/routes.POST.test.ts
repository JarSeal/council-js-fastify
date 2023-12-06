import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createForm, createUser, csrfHeader, validAgentId } from '../../test/utils';
import { SESSION_COOKIE_NAME } from '../../core/config';
import type { FormDataPostReply } from './routes';
import type { PublicPrivilegeProp } from '../../dbModels/_modelTypePartials';

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
});

import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { createForm } from '../../test/utils';

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

  it('should fail when "formData" array is missing from the body', async () => {
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
          priAccessId: 'canAccess',
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
      body: {},
    });
    expect(response.statusCode).toBe(500);
  });
});

import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import type { FormDataGetReply } from './routes';

describe('formData', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await initApp();
  });

  afterEach(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should test the formData GET route with a non-existing route', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/someweirdapi',
    });
    const body = JSON.parse(response.body) as FormDataGetReply;
    expect(response.statusCode).toBe(404);
    expect(body.code).toEqual('NOT_FOUND');
    expect(body.message).toEqual('Could not find form with url "/api/v1/someweirdapi"');
  });
});

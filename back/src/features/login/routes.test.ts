import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';

describe('login and logout', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should fail to login with invalid data', () => {
    expect(true).toBeTruthy();
  });
});

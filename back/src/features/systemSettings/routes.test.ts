import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';

describe('systemSettings', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should fail GET without the CSRF header', async () => {
    //
  });

  // should fail GET without proper payload

  // should fail GET with invalid payload values

  // should GET all settings successfully

  // should GET one setting with settingId successfully

  // should GET multiple settings with settingId successfully

  // should GET all settings from one category successfully and also the form

  // should GET all settings from two categories successfully

  // should fail PUT without the CSRF header

  // should fail PUT without proper payload

  // should fail PUT with invalid payload values

  // should successfully PUT and create one settings doc

  // should successfully PUT and create multiple settings docs

  // should successfully PUT and edit one settings doc and get data

  // should successfully PUT and edit multiple settings docs and get data
});

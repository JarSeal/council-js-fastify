import type { FastifyInstance } from 'fastify';
import type { Mongoose } from 'mongoose';
import mongoose from 'mongoose';

import { ENVIRONMENT, MONGODB_URI, MONGODB_URI_TEST } from './config';

export const initDB = async (app: FastifyInstance) => {
  if (ENVIRONMENT !== 'test') {
    try {
      await mongoose.connect(MONGODB_URI || '');
      app.log.info('Connected to DB');
    } catch (err) {
      app.log.error(err);
      throw new Error('Could not connect to DB');
    }
  }
};

export const initDTestDB = async (): Promise<Mongoose | undefined> => {
  let testDB;
  if (ENVIRONMENT === 'test') {
    try {
      testDB = await mongoose.connect(MONGODB_URI_TEST || '');
    } catch (err) {
      return undefined;
    }
  }
  return testDB;
};

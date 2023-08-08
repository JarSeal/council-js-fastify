import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import { ENVIRONMENT, MONGODB_URI, MONGODB_URI_TEST } from './config';

export const initDB = async (app: FastifyInstance) => {
  const dbURI = ENVIRONMENT !== 'test' ? MONGODB_URI : MONGODB_URI_TEST;
  try {
    await mongoose.connect(dbURI || '');
    app.log.info('Connected to DB');
  } catch (err) {
    app.log.error(err);
    throw new Error('Could not connect to DB');
  }
};

import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import { ENVIRONMENT, MONGODB_URI, MONGODB_URI_TEST } from './config';

export const initDB = async (app: FastifyInstance) => {
  const mongoURI = ENVIRONMENT === 'test' ? MONGODB_URI_TEST : MONGODB_URI;
  try {
    await mongoose.connect(mongoURI || '');
    app.log.info('Connected to DB');
  } catch (err) {
    app.log.error(err);
    throw new Error('Could not connect to DB');
  }
};

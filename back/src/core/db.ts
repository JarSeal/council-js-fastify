import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import { ENVIRONMENT, MONGODB_URI, MONGODB_URI_TEST } from './config.js';

export const initDB = async (app?: FastifyInstance) => {
  const dbURI = ENVIRONMENT !== 'test' ? MONGODB_URI : MONGODB_URI_TEST;
  try {
    await mongoose.connect(dbURI || '');
    if (app) {
      app.log.info('Connected to DB');
    } else if (ENVIRONMENT !== 'test') {
      // eslint-disable-next-line no-console
      console.log('Connected to DB');
    }
  } catch (err) {
    if (app) {
      app.log.error(err);
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    throw new Error('Could not connect to DB');
  }
};

export const closeDB = async (app?: FastifyInstance) => {
  try {
    await mongoose.disconnect();
    if (app) {
      app.log.info('Disconnected from DB');
    } else if (ENVIRONMENT !== 'test') {
      // eslint-disable-next-line no-console
      console.log('Disconnected from DB');
    }
  } catch (err) {
    if (app) {
      app.log.error(err);
    } else {
      // eslint-disable-next-line no-console
      console.error(err);
    }
    throw new Error('Could not connect to DB');
  }
};

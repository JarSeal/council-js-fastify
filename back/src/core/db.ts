import type { FastifyInstance } from 'fastify';
// import mongoose from 'mongoose';

export const initDB = (app: FastifyInstance) => {
  try {
    // mongoose.connect(); // @TODO: Add docker container with mongo, add url to env and import here
  } catch (err) {
    app.log.error(err);
  }
};

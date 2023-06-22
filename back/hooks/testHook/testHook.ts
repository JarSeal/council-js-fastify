import type { FastifyInstance } from 'fastify';

export const testHook = (instance: FastifyInstance) => () => {
  instance.log.info('Test');

  return Promise.resolve();
};

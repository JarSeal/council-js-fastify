import type { FastifyReply, FastifyRequest } from 'fastify';

export const testHook = (req: FastifyRequest, _res: FastifyReply) => () => {
  req.log.info('Test');

  return Promise.resolve();
};

import type { FastifyReply, FastifyRequest } from 'fastify';

// import { SESSION_COOKIE_NAME } from '../core/session';

export const notSignedInHook = (req: FastifyRequest, _res: FastifyReply) => {
  console.log('HERE', req.cookies);

  return Promise.resolve();
};

import type { FastifyReply, FastifyRequest } from 'fastify';

import { errors } from '../core/errors.js';

export const notSignedInHook = (req: FastifyRequest, res: FastifyReply) => {
  if (req.session.isSignedIn) {
    return res.send(new errors.SESSION_CANNOT_BE_SIGNED_IN());
  }
  return Promise.resolve();
};

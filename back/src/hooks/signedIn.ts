import type { FastifyReply, FastifyRequest } from 'fastify';

import { errors } from '../core/errors';

export const signedInHook = async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.session.isSignedIn) {
    return res.send(new errors.UNAUTHORIZED('Must be signed in'));
  }
  return Promise.resolve();
};

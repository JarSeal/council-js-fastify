import type { FastifyReply, FastifyRequest } from 'fastify';

import { errors } from '../core/errors';

export const signedInHook = async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.session.isSignedIn) {
    return res.send(new errors.UNAUTHORIZED('Must be signed in'));
  }
  // @TODO (also add to formData and login response):
  // 1. Check email verification need
  // 2. Check mandatory pass change need
  // 3. Check mandatory UserData need
  return Promise.resolve();
};

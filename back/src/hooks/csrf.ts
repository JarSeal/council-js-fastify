import type { FastifyReply, FastifyRequest } from 'fastify';

import { errors } from '../core/errors';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';

export const csrfHook = async (req: FastifyRequest, res: FastifyReply) => {
  if (req.headers[CSRF_HEADER_NAME] !== CSRF_HEADER_VALUE) {
    req.log.warn(`Request without the CSRF-header ("${CSRF_HEADER_NAME}") was made`);
    return res.send(new errors.UNAUTHORIZED('CSRF-header is required'));
  }
  return Promise.resolve();
};

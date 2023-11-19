import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

import { errors } from '../core/errors';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';

export const csrfHook = async (req: FastifyRequest, res: FastifyReply) => {
  const csrfError = csrfCheck(req);
  if (csrfError) {
    return res.send(csrfError);
  }
  return Promise.resolve();
};

export const isCsrfGood = (req: FastifyRequest) =>
  req.headers && req.headers[CSRF_HEADER_NAME] === CSRF_HEADER_VALUE;

export const csrfCheck = (req: FastifyRequest): null | FastifyError => {
  if (!isCsrfGood(req)) {
    req.log.warn(
      `Request with a missing or invalid CSRF-header or ("${CSRF_HEADER_NAME}") was made`
    );
    return new errors.UNAUTHORIZED('CSRF-header is invalid or missing');
  }
  return null;
};

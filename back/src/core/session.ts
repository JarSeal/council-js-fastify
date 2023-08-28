import type { FastifyError, FastifyReply } from 'fastify';

import type { ErrorCodes } from './errors';
import { IS_PRODUCTION } from './config';

export const cookieName = (name: string) => (IS_PRODUCTION ? `__Host-${name}` : name);

export const SESSION_COOKIE_OPTIONS = {
  path: '/',
  httpOnly: IS_PRODUCTION,
  secure: IS_PRODUCTION,
  signed: true,
  maxAge: 60 * 60,
};
export const SESSION_COOKIE_NAME = cookieName('counclSess');

export const sendWithSessionCookie = (
  res: FastifyReply,
  payload:
    | (FastifyError & {
        code: ErrorCodes;
      })
    | ({ [k: string]: unknown } & { statusCode?: number }),
  status?: number
) =>
  res
    .status(status ? status : payload.statusCode || 200)
    .setCookie(SESSION_COOKIE_NAME, 'fooValue', SESSION_COOKIE_OPTIONS)
    .send(payload);

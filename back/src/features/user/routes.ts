import { type Static, Type } from '@sinclair/typebox';
import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';

import { verifyEmail } from './handlers';

const verifyEmailQuerystringSchema = Type.Object({
  token: Type.String(),
});
type VerifyEmailQuerystring = Static<typeof verifyEmailQuerystringSchema>;

const verifyEmailReplySchema = Type.Object({
  ok: Type.Boolean(),
});
export type VerifyEmailReply = Static<typeof verifyEmailReplySchema>;

export interface VerifyEmailRoute extends RouteGenericInterface {
  readonly Querystring: VerifyEmailQuerystring;
  readonly Reply: VerifyEmailReply | FastifyError;
}

const userPublicRoutes: FastifyPluginAsync = (instance) => {
  instance.route<VerifyEmailRoute>({
    method: 'GET',
    url: '/user/verify-email',
    handler: verifyEmail,
    schema: {
      querystring: verifyEmailQuerystringSchema,
      response: { 200: verifyEmailReplySchema },
    },
  });

  // @TODO: GET /get-verification-email

  return Promise.resolve();
};

export { userPublicRoutes };

import { type Static, Type } from '@sinclair/typebox';
import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';

import { sendVerificationEmail, verifyEmail } from './handlers';

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

  return Promise.resolve();
};

const sendVerificationEmailParamsSchema = Type.Object({
  emailIndex: Type.Number(),
});
type SendVerificationEmailParams = Static<typeof sendVerificationEmailParamsSchema>;

export interface SendVerificationEmailRoute extends RouteGenericInterface {
  readonly Params: SendVerificationEmailParams;
  readonly Reply: VerifyEmailReply | FastifyError;
}

const userSignedInRoutes: FastifyPluginAsync = (instance) => {
  instance.route<SendVerificationEmailRoute>({
    method: 'GET',
    url: '/user/send-verification-email/:emailIndex',
    handler: sendVerificationEmail,
    schema: {
      params: sendVerificationEmailParamsSchema,
      response: { 200: verifyEmailReplySchema },
    },
  });

  return Promise.resolve();
};

export { userPublicRoutes, userSignedInRoutes };

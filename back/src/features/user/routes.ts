import { type Static, Type } from '@sinclair/typebox';
import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';

import { forgotPassword, sendVerificationEmail, verifyEmail } from './handlers';

const justOkReplySchema = Type.Object({
  ok: Type.Boolean(),
});
export type JustOkReply = Static<typeof justOkReplySchema>;

const verifyEmailQuerystringSchema = Type.Object({
  token: Type.String(),
});
type VerifyEmailQuerystring = Static<typeof verifyEmailQuerystringSchema>;
export interface VerifyEmailRoute extends RouteGenericInterface {
  readonly Querystring: VerifyEmailQuerystring;
  readonly Reply: JustOkReply | FastifyError;
}

const sendNewPasswordLinkBodySchema = Type.Object({
  email: Type.Optional(Type.String({ format: 'email' })),
  username: Type.Optional(Type.String()),
});
type SendNewPasswordLinkBody = Static<typeof sendNewPasswordLinkBodySchema>;
export interface SendNewPasswordRoute extends RouteGenericInterface {
  readonly Body: SendNewPasswordLinkBody;
  readonly Reply: JustOkReply | FastifyError;
}

const userPublicRoutes: FastifyPluginAsync = (instance) => {
  instance.route<VerifyEmailRoute>({
    method: 'GET',
    url: '/user/verify-email',
    handler: verifyEmail,
    schema: {
      querystring: verifyEmailQuerystringSchema,
      response: { 200: justOkReplySchema },
    },
  });

  instance.route<SendNewPasswordRoute>({
    method: 'POST',
    url: '/user/forgot-password',
    handler: forgotPassword,
    schema: {
      body: sendNewPasswordLinkBodySchema,
      response: { 200: justOkReplySchema },
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
  readonly Reply: JustOkReply | FastifyError;
}

const userSignedInRoutes: FastifyPluginAsync = (instance) => {
  instance.route<SendVerificationEmailRoute>({
    method: 'GET',
    url: '/user/send-verification-email/:emailIndex',
    handler: sendVerificationEmail,
    schema: {
      params: sendVerificationEmailParamsSchema,
      response: { 200: justOkReplySchema },
    },
  });

  return Promise.resolve();
};

export { userPublicRoutes, userSignedInRoutes };

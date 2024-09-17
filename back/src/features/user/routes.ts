import { type Static, Type } from '@sinclair/typebox';
import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';

import { forgotPassword, resetPassword, sendVerificationEmail, verifyEmail } from './handlers';
import { formDataErrorSchema } from '../formData/routes';

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

const resetPasswordBodySchema = Type.Object({
  pass: Type.String(),
  passAgain: Type.String(),
  token: Type.String(),
});
type ResetPasswordBody = Static<typeof resetPasswordBodySchema>;
const resetPasswordResponseSchema = Type.Object({
  ok: Type.Boolean(),
  error: Type.Optional(formDataErrorSchema),
});
type ResetPasswordResponse = Static<typeof resetPasswordResponseSchema>;
export interface ResetPasswordRoute extends RouteGenericInterface {
  readonly Body: ResetPasswordBody;
  readonly Reply: ResetPasswordResponse | FastifyError; // @TODO: add error object
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

  instance.route<ResetPasswordRoute>({
    method: 'POST',
    url: '/user/reset-password',
    handler: resetPassword,
    schema: {
      body: resetPasswordBodySchema,
      response: { 200: resetPasswordResponseSchema },
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

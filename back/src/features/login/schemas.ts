import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const loginMethodsSchema = Type.Union([Type.Literal('username'), Type.Literal('email')]);
export type LoginMethods = Static<typeof loginMethodsSchema>;

export const loginBodySchema = Type.Object({
  usernameOrEmail: Type.String(),
  pass: Type.String(),
  loginMethod: loginMethodsSchema,
  agentId: Type.String({ minLength: 32, maxLength: 32 }),
});

export const requiredActionsDBSchema = {
  userDataMissingOrInvalid: { type: Boolean },
  forcePassChange: { type: Boolean },
  primaryEmailIsUnverified: { type: Boolean },
};
export const requiredActionsSchema = Type.Union([
  Type.Object({
    userDataMissingOrInvalid: Type.Optional(Type.Boolean()),
    forcePassChange: Type.Optional(Type.Boolean()),
    primaryEmailIsUnverified: Type.Optional(Type.Boolean()),
  }),
  Type.Null(),
]);
export type RequiredActions = Static<typeof requiredActionsSchema>;

export const replySchema = Type.Object({
  ok: Type.Boolean(),
  requiredActions: requiredActionsSchema,
  publicSettings: Type.Record(Type.String(), Type.Unknown()),
  twoFactorUser: Type.Optional(Type.String()),
});
export type Reply = Static<typeof replySchema>;

export interface LoginRoute extends RouteGenericInterface {
  readonly Body: Static<typeof loginBodySchema>;
  readonly Reply: Reply | FastifyError;
}

export const twoFactorLoginBodySchema = Type.Object({
  username: Type.String(),
  code: Type.String(),
  agentId: Type.String({ minLength: 32, maxLength: 32 }),
});

export interface TwoFactorLoginRoute extends RouteGenericInterface {
  readonly Body: Static<typeof twoFactorLoginBodySchema>;
  readonly Reply: Reply | FastifyError;
}

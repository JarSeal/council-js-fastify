import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const bodySchema = Type.Object({
  formId: Type.String(),
  usernameOrEmail: Type.String(),
  pass: Type.String(),
  loginMethod: Type.Union([Type.Literal('username'), Type.Literal('email')]),
  agentId: Type.String({ minLength: 32, maxLength: 32 }),
});

export const replySchema = Type.Object({
  ok: Type.Boolean(),
  forcePassChange: Type.Optional(Type.Boolean()),
  twoFactor: Type.Optional(Type.Boolean()),
});

export interface LoginRoute extends RouteGenericInterface {
  readonly Body: Static<typeof bodySchema>;
  readonly Reply: Static<typeof replySchema> | FastifyError;
}

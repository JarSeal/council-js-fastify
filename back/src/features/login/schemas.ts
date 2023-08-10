import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const bodySchema = Type.Object({
  usernameOrEmail: Type.String(),
  pass: Type.String(),
});

export const replySchema = Type.Object({ ok: Type.Boolean() });

export interface LoginRoute extends RouteGenericInterface {
  readonly Body: Static<typeof bodySchema>;
  readonly Reply: Static<typeof replySchema> | FastifyError;
}

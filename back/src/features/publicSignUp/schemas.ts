import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const bodySchema = Type.Object({
  username: Type.String(),
  email: Type.String(),
  pass: Type.String(),
});

export const replySchema = Type.Object({ ok: Type.Boolean() });

export interface PublicSignUpRoute extends RouteGenericInterface {
  readonly Body: Static<typeof bodySchema>;
  readonly Reply: Static<typeof replySchema> | FastifyError;
}

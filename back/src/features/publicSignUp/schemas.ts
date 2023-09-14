import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const bodySchema = Type.Object({
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  pass: Type.String(),
});

export type Body = Static<typeof bodySchema>;

export const replySchema = Type.Object({ ok: Type.Boolean() });

export interface PublicSignUpRoute extends RouteGenericInterface {
  readonly Body: Body;
  readonly Reply: Static<typeof replySchema> | FastifyError;
}

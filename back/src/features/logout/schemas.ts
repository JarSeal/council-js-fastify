import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const bodySchema = Type.Object({
  redirectUrl: Type.Optional(Type.String()),
});

export type Body = Static<typeof bodySchema>;

export const replySchema = Type.Object({
  ok: Type.Boolean(),
});

export interface LogoutRoute extends RouteGenericInterface {
  readonly Body: Body;
  readonly Reply: Static<typeof replySchema> | FastifyError;
}

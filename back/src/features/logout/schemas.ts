import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

export const replySchema = Type.Object({
  ok: Type.Boolean(),
});

export interface LogoutRoute extends RouteGenericInterface {
  readonly Reply: Static<typeof replySchema> | FastifyError;
}

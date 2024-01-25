import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';
import type { RouteGenericInterface, FastifyError } from 'fastify';

import { formDataErrorSchema } from '../formData/routes';

export const bodySchema = Type.Object({
  username: Type.String(),
  email: Type.String({ format: 'email' }),
  emailAgain: Type.String({ format: 'email' }),
  pass: Type.String(),
  passAgain: Type.String(),
});

export type Body = Static<typeof bodySchema>;

export const replySchema = Type.Object({
  ok: Type.Boolean(),
  error: Type.Optional(formDataErrorSchema),
});

export type Reply = Static<typeof replySchema>;

export interface PublicSignUpRoute extends RouteGenericInterface {
  readonly Body: Body;
  readonly Reply: Reply | FastifyError;
}

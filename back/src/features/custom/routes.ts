import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { customPost } from './handlers';

export const postBodySchema = Type.Object({
  formId: Type.String(),
});

export type PostBody = Static<typeof postBodySchema>;

export interface CustomPostRoute extends RouteGenericInterface {
  readonly Body: PostBody;
  readonly Reply: { ok: boolean } | FastifyError;
}

const customRoute: FastifyPluginAsync = (instance) => {
  instance.route<CustomPostRoute>({
    method: 'POST',
    url: '/*',
    handler: customPost,
    schema: {
      body: postBodySchema,
      response: { 200: Type.Object({ ok: Type.Boolean() }) },
    },
  });

  return Promise.resolve();
};

export default customRoute;

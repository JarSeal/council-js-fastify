import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { customGet, customPost } from './handlers';

export const postBodySchema = Type.Object({
  formId: Type.String(),
});
export type PostBody = Static<typeof postBodySchema>;

export const getQuerystringSchema = Type.Object({
  getForm: Type.Optional(Type.String()),
  dataId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  elemId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  flat: Type.Optional(Type.Boolean()),
  offset: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number()),
  orderBy: Type.Optional(
    Type.Union([
      Type.Literal('orderNr'),
      Type.Literal('elemId'),
      Type.Literal('value'),
      Type.Literal('valueType'),
    ])
  ),
  orderDir: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  s: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
});
export type GetQuerystring = Static<typeof getQuerystringSchema>;

export interface CustomGetRoute extends RouteGenericInterface {
  readonly Reply: { ok: boolean } | FastifyError;
  readonly Querystring: GetQuerystring;
}

export interface CustomPostRoute extends RouteGenericInterface {
  readonly Body: PostBody;
  readonly Reply: { ok: boolean } | FastifyError;
}

const customRoute: FastifyPluginAsync = (instance) => {
  instance.route<CustomGetRoute>({
    method: 'GET',
    url: '/*',
    handler: customGet,
    schema: {
      response: { 200: Type.Object({ ok: Type.Boolean() }) },
      querystring: getQuerystringSchema,
    },
  });

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

import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { customGet, customPost } from './handlers';
import { formFormSchema } from '../../@types/form';
import { formDataSchema } from '../../@types/formData';

export const postBodySchema = Type.Object({
  formId: Type.String(),
});
export type PostBody = Static<typeof postBodySchema>;

export interface CustomPostRoute extends RouteGenericInterface {
  readonly Body: PostBody;
  readonly Reply: { ok: boolean } | FastifyError;
}

export const getReplySchema = Type.Union([
  Type.Optional(
    Type.Object({
      $form: Type.Optional(formFormSchema),
      data: Type.Optional(Type.Union([Type.Array(formDataSchema), formDataSchema])),
    })
  ),
  Type.Optional(
    Type.Object({
      $form: Type.Optional(formFormSchema),
      ...formDataSchema.schema,
    })
  ),
]);
export type GetReply = Static<typeof getReplySchema>;

export const getQuerystringSchema = Type.Object({
  getForm: Type.Optional(Type.Boolean()),
  dataId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  elemId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  flat: Type.Optional(Type.Boolean()),
  offset: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number()),
  orderBy: Type.Optional(
    Type.Union([
      Type.Literal('created'),
      Type.Literal('edited'),
      Type.Literal('value'),
      Type.Literal('elemId'),
      Type.Literal('valueTypeAndValue'),
    ])
  ),
  orderDir: Type.Optional(Type.Union([Type.Literal('asc'), Type.Literal('desc')])),
  s: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
});
export type GetQuerystring = Static<typeof getQuerystringSchema>;

export interface CustomGetRoute extends RouteGenericInterface {
  readonly Reply: GetReply | FastifyError;
  readonly Querystring: GetQuerystring;
}

const customRoute: FastifyPluginAsync = (instance) => {
  instance.route<CustomGetRoute>({
    method: 'GET',
    url: '/*',
    handler: customGet,
    schema: {
      response: { 200: getReplySchema },
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

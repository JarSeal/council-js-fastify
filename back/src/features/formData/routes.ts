import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { formDataGet } from './handlers.GET';
import { formDataPost } from './handlers.POST';
import { formElemPublicSchema, transTextSchema } from '../../@types/form';

export const postBodySchema = Type.Object({
  formData: Type.Array(
    Type.Object({
      elemId: Type.String(),
      value: Type.Unknown(),
    })
  ),
});
export type FormDataPostBody = Static<typeof postBodySchema>;

export const postBodyReplySchema = Type.Object({
  ok: Type.Boolean(),
  dataId: Type.Optional(Type.String()),
  error: Type.Optional(
    Type.Object({
      errorId: Type.String(),
      message: Type.String(),
      elemId: Type.Optional(Type.String()),
      customError: Type.Optional(Type.Unknown()), // @TODO: should be transTextSchema, but it doesn't work (fix at some point)
    })
  ),
});
export type PostBodyReply = Static<typeof postBodyReplySchema>;

export interface FormDataPostRoute extends RouteGenericInterface {
  readonly Body: FormDataPostBody;
  readonly Reply: PostBodyReply | FastifyError;
}

export const getFormReplySchema = Type.Object({
  formTitle: transTextSchema,
  formText: transTextSchema,
  classes: Type.Array(Type.String()),
  lockOrder: Type.Boolean(),
  formElems: Type.Array(formElemPublicSchema),
});
export type GetFormReply = Static<typeof getFormReplySchema>;
// @CONSIDER: is this getReplySchema enough? Should there be more specific typing?
export const getReplySchema = Type.Record(Type.String(), Type.Unknown());
export type FormDataGetReply = Static<typeof getReplySchema>;

export const getQuerystringSchema = Type.Object({
  getForm: Type.Optional(Type.Boolean()),
  dataId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  elemId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  flat: Type.Optional(Type.Boolean()),
  offset: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number()),
  sort: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  s: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  sOper: Type.Optional(Type.String()),
  sCase: Type.Optional(Type.Boolean()),
  includeDataIds: Type.Optional(Type.String()),
  includeLabels: Type.Optional(Type.String()),
  includeMeta: Type.Optional(Type.String()),
  meAsCreator: Type.Optional(Type.Boolean()),
  meAsOwner: Type.Optional(Type.Boolean()),
});
export type GetQuerystring = Static<typeof getQuerystringSchema>;

export interface FormDataGetRoute extends RouteGenericInterface {
  readonly Reply: FormDataGetReply | FastifyError;
  readonly Querystring: GetQuerystring;
}

const formDataRoute: FastifyPluginAsync = (instance) => {
  instance.route<FormDataGetRoute>({
    method: 'GET',
    url: '/*',
    handler: formDataGet,
    schema: {
      response: { 200: getReplySchema },
      querystring: getQuerystringSchema,
    },
  });

  instance.route<FormDataPostRoute>({
    method: 'POST',
    url: '/*',
    handler: formDataPost,
    schema: {
      body: postBodySchema,
      response: { 200: postBodyReplySchema, 400: postBodyReplySchema },
    },
  });

  return Promise.resolve();
};

export default formDataRoute;

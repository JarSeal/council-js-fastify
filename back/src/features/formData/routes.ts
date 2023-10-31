import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { formDataGet, formDataPost } from './handlers';
import { formElemPublicSchema, transTextSchema } from '../../@types/form';

export const postBodySchema = Type.Object({
  formId: Type.String(),
});
export type FormDataPostBody = Static<typeof postBodySchema>;

export interface FormDataPostRoute extends RouteGenericInterface {
  readonly Body: FormDataPostBody;
  readonly Reply: { ok: boolean } | FastifyError;
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
  includeDataIds: Type.Optional(Type.String()),
  includeLabels: Type.Optional(Type.String()),
  includeMeta: Type.Optional(Type.String()),
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
      response: { 200: Type.Object({ ok: Type.Boolean() }) },
    },
  });

  return Promise.resolve();
};

export default formDataRoute;

import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { formDataGet } from './handlers.GET';
import { formDataPost } from './handlers.POST';
import {
  allPrivilegePropsSchema,
  basicPrivilegePropsSchema,
  formElemPublicSchema,
  transTextSchema,
} from '../../@types/form';
import { formDataPut } from './handlers.PUT';

// GET
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
  includePrivileges: Type.Optional(Type.Boolean()),
  meAsCreator: Type.Optional(Type.Boolean()),
  meAsOwner: Type.Optional(Type.Boolean()),
  meAsEditor: Type.Optional(Type.Boolean()),
});
export type GetQuerystring = Static<typeof getQuerystringSchema>;
export interface FormDataGetRoute extends RouteGenericInterface {
  readonly Reply: FormDataGetReply | FastifyError;
  readonly Querystring: GetQuerystring;
}

// POST
export const formDataPostBodySchema = Type.Object({
  formData: Type.Array(
    Type.Object({
      elemId: Type.String(),
      value: Type.Unknown(),
      privileges: Type.Optional(
        Type.Object({
          read: Type.Optional(allPrivilegePropsSchema),
          edit: Type.Optional(allPrivilegePropsSchema),
        })
      ),
    })
  ),
  getData: Type.Optional(Type.Union([Type.Boolean(), getQuerystringSchema])),
  privileges: Type.Optional(
    Type.Object({
      read: Type.Optional(allPrivilegePropsSchema),
      edit: Type.Optional(allPrivilegePropsSchema),
      delete: Type.Optional(allPrivilegePropsSchema),
    })
  ),
  canEditPrivileges: Type.Optional(basicPrivilegePropsSchema),
});
export type FormDataPostBody = Static<typeof formDataPostBodySchema>;
export const formDataPostBodyReplySchema = Type.Object({
  ok: Type.Boolean(),
  dataId: Type.Optional(Type.String()),
  getData: Type.Optional(getReplySchema),
  error: Type.Optional(
    Type.Object({
      errorId: Type.String(),
      message: Type.String(),
      elemId: Type.Optional(Type.String()),
      customError: Type.Optional(Type.Unknown()), // @TODO: should be transTextSchema, but it doesn't work (fix at some point)
    })
  ),
});
export type FormDataPostReply = Static<typeof formDataPostBodyReplySchema>;
export interface FormDataPostRoute extends RouteGenericInterface {
  readonly Body: FormDataPostBody;
  readonly Reply: FormDataPostReply | FastifyError;
}

// PUT
export const formDataPutBodySchema = Type.Object({
  dataId: Type.Union([Type.String(), Type.Array(Type.String())]),
  formData: Type.Array(
    Type.Object({
      elemId: Type.String(),
      value: Type.Unknown(),
      privileges: Type.Optional(
        Type.Object({
          read: Type.Optional(allPrivilegePropsSchema),
          edit: Type.Optional(allPrivilegePropsSchema),
        })
      ),
    })
  ),
  getData: Type.Optional(Type.Union([Type.Boolean(), getQuerystringSchema])),
  privileges: Type.Optional(
    Type.Object({
      read: Type.Optional(allPrivilegePropsSchema),
      edit: Type.Optional(allPrivilegePropsSchema),
      delete: Type.Optional(allPrivilegePropsSchema),
    })
  ),
  canEditPrivileges: Type.Optional(basicPrivilegePropsSchema),
});
export type FormDataPutBody = Static<typeof formDataPutBodySchema>;
export const formDataPutBodyReplySchema = Type.Object({
  ok: Type.Boolean(),
  dataId: Type.Optional(Type.Union([Type.String(), Type.Array(Type.String())])),
  getData: Type.Optional(getReplySchema),
  error: Type.Optional(
    Type.Object({
      errorId: Type.String(),
      message: Type.String(),
      elemId: Type.Optional(Type.String()),
      customError: Type.Optional(Type.Unknown()), // @TODO: should be transTextSchema, but it doesn't work (fix at some point)
    })
  ),
});
export type FormDataPutReply = Static<typeof formDataPutBodyReplySchema>;
export interface FormDataPutRoute extends RouteGenericInterface {
  readonly Body: FormDataPutBody;
  readonly Reply: FormDataPutReply | FastifyError;
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
      body: formDataPostBodySchema,
      response: { 200: formDataPostBodyReplySchema, 400: formDataPostBodyReplySchema },
    },
  });

  instance.route<FormDataPutRoute>({
    method: 'PUT',
    url: '/*',
    handler: formDataPut,
    schema: {
      body: formDataPutBodySchema,
      response: { 200: formDataPutBodyReplySchema, 400: formDataPutBodyReplySchema },
    },
  });

  return Promise.resolve();
};

export default formDataRoute;

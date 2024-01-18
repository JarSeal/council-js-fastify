import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { systemSettingsGetRoute, systemSettingsPutRoute } from './handlers';
import { editedSchema } from '../../@types/form';

const dataSchema = Type.Object({
  elemId: Type.String(),
  value: Type.Unknown(),
  valueType: Type.String(),
  category: Type.String(),
  edited: editedSchema,
  orderNr: Type.Number(),
});

// Read (GET)
export const systemSettingsGetQuerystringSchema = Type.Object({
  settingId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  category: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  getForm: Type.Optional(Type.Boolean()),
});
export type SystemSettingsGetQuerystring = Static<typeof systemSettingsGetQuerystringSchema>;
export const systemSettingsGetReplySchema = Type.Object({
  data: Type.Array(dataSchema),
  form: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type SystemSettingsGetReply = Static<typeof systemSettingsGetReplySchema>;
export interface SystemSettingsGetRoute extends RouteGenericInterface {
  readonly Querystring: SystemSettingsGetQuerystring;
  readonly Reply: SystemSettingsGetReply | FastifyError;
}

// Edit / Create (PUT)
export const systemSettignsPutBodySchema = Type.Object({
  data: Type.Array(
    Type.Object({
      elemId: Type.String(),
      value: Type.Unknown(),
    })
  ),
  getData: Type.Optional(systemSettingsGetQuerystringSchema),
});
export type SystemSettingsPutBody = Static<typeof systemSettignsPutBodySchema>;
export const systemSettingsPutReplySchema = Type.Object({
  ok: Type.Boolean(),
  error: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  data: Type.Optional(Type.Array(dataSchema)),
  form: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
});
export type SystemSettingsPutReply = Static<typeof systemSettingsPutReplySchema>;
export interface SystemSettingsPutRoute extends RouteGenericInterface {
  readonly Body: SystemSettingsPutBody;
  readonly Reply: SystemSettingsPutReply | FastifyError;
}

const systemSettingsRoutes: FastifyPluginAsync = (instance) => {
  instance.route<SystemSettingsGetRoute>({
    method: 'GET',
    url: '/system-settings',
    handler: systemSettingsGetRoute,
    schema: {
      querystring: systemSettingsGetQuerystringSchema,
      response: { 200: systemSettingsGetReplySchema },
    },
  });

  instance.route<SystemSettingsPutRoute>({
    method: 'PUT',
    url: '/system-settings',
    handler: systemSettingsPutRoute,
    schema: {
      body: systemSettignsPutBodySchema,
      response: { 200: systemSettingsPutReplySchema },
    },
  });

  return Promise.resolve();
};

export default systemSettingsRoutes;

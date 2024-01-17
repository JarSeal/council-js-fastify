import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

import { systemSettingsGetRoute } from './handlers';

export const systemSettingsGetReplySchema = Type.Array(
  Type.Object({
    elemId: Type.String(),
    value: Type.Union([Type.String(), Type.Undefined()]),
    valueType: Type.String(),
    category: Type.String(),
  })
);

export const systemSettingsGetQuerystringSchema = Type.Object({
  settingId: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
  category: Type.Optional(Type.Union([Type.Array(Type.String()), Type.String()])),
});
export type SystemSettingsGetQuerystring = Static<typeof systemSettingsGetQuerystringSchema>;
export interface SystemSettingsGetRoute extends RouteGenericInterface {
  readonly Reply: Static<typeof systemSettingsGetReplySchema> | FastifyError;
  readonly Querystring: SystemSettingsGetQuerystring;
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

  return Promise.resolve();
};

export default systemSettingsRoutes;

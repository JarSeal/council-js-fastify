import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { type Static, Type } from '@sinclair/typebox';

export const systemSettingsGetReplySchema = Type.Object({ ok: Type.Boolean() });

export interface LoginRoute extends RouteGenericInterface {
  readonly Reply: Static<typeof systemSettingsGetReplySchema> | FastifyError;
}

const loginRoute: FastifyPluginAsync = (instance) => {
  instance.route<LoginRoute>({
    method: 'GET',
    url: '/system-settings',
    handler: () => ({ ok: true }),
    schema: {
      response: { 200: systemSettingsGetReplySchema },
    },
  });

  return Promise.resolve();
};

export default loginRoute;

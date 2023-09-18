import type { FastifyPluginAsync } from 'fastify';

import { bodySchema, replySchema } from './schemas';
import type { LogoutRoute } from './schemas';
import { logout } from './handlers';

const logoutRoute: FastifyPluginAsync = (instance) => {
  instance.route<LogoutRoute>({
    method: 'POST',
    url: '/logout',
    handler: logout,
    schema: {
      body: bodySchema,
      response: { 200: replySchema },
    },
  });

  return Promise.resolve();
};

export default logoutRoute;

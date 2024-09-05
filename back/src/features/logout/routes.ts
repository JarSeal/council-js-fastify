import type { FastifyPluginAsync } from 'fastify';

import { bodySchema, replySchema } from './schemas.js';
import type { LogoutRoute } from './schemas.js';
import { logout } from './handlers.js';

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

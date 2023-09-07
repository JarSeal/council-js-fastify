import type { FastifyPluginAsync } from 'fastify';

import { replySchema } from './schemas';
import type { LogoutRoute } from './schemas';
import { logout } from './handlers';

const logoutRoute: FastifyPluginAsync = (instance) => {
  instance.route<LogoutRoute>({
    method: 'POST',
    url: '/logout',
    handler: logout,
    schema: { response: { 200: replySchema } },
  });

  return Promise.resolve();
};

export default logoutRoute;

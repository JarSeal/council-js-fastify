import type { FastifyPluginAsync } from 'fastify';

import { bodySchema, replySchema } from './schemas';
import type { LoginRoute } from './schemas';

const loginRoute: FastifyPluginAsync = (instance) => {
  instance.route<LoginRoute>({
    method: 'POST',
    url: '/login',
    handler: () => ({ ok: true }),
    schema: {
      body: bodySchema,
      response: { 200: replySchema },
    },
  });

  return Promise.resolve();
};

export default loginRoute;

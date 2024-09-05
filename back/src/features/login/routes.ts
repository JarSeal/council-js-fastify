import type { FastifyPluginAsync } from 'fastify';

import { loginBodySchema, replySchema, twoFactorLoginBodySchema } from './schemas.js';
import type { LoginRoute, TwoFactorLoginRoute } from './schemas.js';
import { login, twoFALogin } from './handlers.js';

const loginRoute: FastifyPluginAsync = (instance) => {
  instance.route<LoginRoute>({
    method: 'POST',
    url: '/login',
    handler: login,
    schema: {
      body: loginBodySchema,
      response: { 200: replySchema },
    },
  });

  instance.route<TwoFactorLoginRoute>({
    method: 'POST',
    url: '/login/2fa',
    handler: twoFALogin,
    schema: {
      body: twoFactorLoginBodySchema,
      response: { 200: replySchema },
    },
  });

  return Promise.resolve();
};

export default loginRoute;

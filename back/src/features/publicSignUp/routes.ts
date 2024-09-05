import type { FastifyPluginAsync } from 'fastify';

import { publicSignUp } from './handlers.js';
import { bodySchema, replySchema } from './schemas.js';
import type { PublicSignUpRoute } from './schemas.js';

const publicSignUpRoute: FastifyPluginAsync = (instance) => {
  instance.route<PublicSignUpRoute>({
    method: 'POST',
    url: '/public-signup',
    handler: publicSignUp,
    schema: {
      body: bodySchema,
      response: { 200: replySchema },
    },
  });

  return Promise.resolve();
};

export default publicSignUpRoute;

import type { FastifyPluginAsync } from 'fastify';

import { publicSignUp } from './handlers';
import { bodySchema, replySchema } from './schemas';
import type { PublicSignUpRoute } from './schemas';

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

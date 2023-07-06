import type { FastifyPluginAsync } from 'fastify';

import { publicSignUp } from './handlers';
import { bodySchema, responseSchema } from './schemas';
import type { PublicSignUpRoute } from './schemas';

const publicSignUpRoute: FastifyPluginAsync = (instance) => {
  instance.route<PublicSignUpRoute>({
    method: 'POST',
    url: '/publicsignup',
    handler: publicSignUp,
    schema: {
      body: bodySchema,
      response: { 200: responseSchema },
    },
  });

  return Promise.resolve();
};

export default publicSignUpRoute;

import type { FastifyPluginAsync } from 'fastify';

import { publicSignUp } from './handlers';
import { bodySchema, responseSchema } from './schemas';

const publicSignUpRoute: FastifyPluginAsync = (instance) => {
  instance.route({
    method: 'POST',
    url: '/signup',
    handler: publicSignUp,
    schema: {
      body: bodySchema,
      response: { 200: responseSchema },
    },
  });

  return Promise.resolve();
};

export default publicSignUpRoute;

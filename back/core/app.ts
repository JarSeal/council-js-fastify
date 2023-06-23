import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

import { ENVIRONMENT, CLIENT_HOST_NAMES } from './config';
import type { Environment } from './config';
import apis from './apis';

const initApp = async (): Promise<FastifyInstance> => {
  const envToLogger = {
    development: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
    production: true,
    test: false,
  };
  const app = fastify({
    logger: envToLogger[ENVIRONMENT as Environment],
  });

  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
      } else {
        const hostnameFromRequest = new URL(origin).hostname;
        const hostnameArray = CLIENT_HOST_NAMES.split(',').map((h) => h.trim());
        if (hostnameArray.includes(hostnameFromRequest)) {
          cb(null, true);
        } else {
          cb(new Error('Not allowed'), false);
        }
      }
    },
  });

  await app.register(apis, { prefix: '/api' });

  return app;
};

export default initApp;

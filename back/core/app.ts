import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';

import { ENVIRONMENT, CLIENT_HOST_NAMES } from './config';
import type { Environment } from './config';

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
  const curEnv =
    ['development', 'production', 'test'].find((env) => env === ENVIRONMENT) || 'development';
  const app = fastify({
    logger: envToLogger[curEnv as Environment],
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

  return app;
};

export default initApp;

import path from 'path';
import fs from 'fs';
import fastify from 'fastify';
import type { FastifyInstance } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import { ENVIRONMENT, CLIENT_HOST_NAMES } from './config';
import type { Environment } from './config';
import apis from './apis';
import { initDB } from './db';

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

  // Fastify
  const app = fastify({
    logger: envToLogger[ENVIRONMENT as Environment],
  }).withTypeProvider<TypeBoxTypeProvider>();

  // CORS
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

  // Database
  await initDB(app);

  // API routes
  await app.register(apis, { prefix: '/api' });

  // Static files
  let publicPath = path.join(__dirname, '../public');
  if (!fs.existsSync(publicPath)) {
    // For development
    publicPath = path.join(__dirname, '../../../shared/public');
  }
  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/public/',
  });

  // Client routes (all GET routes, except the API routes)
  app.get('*', (_, response) => response.sendFile('index.html'));

  return app;
};

export default initApp;

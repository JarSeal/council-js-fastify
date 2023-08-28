import path from 'path';
import fs from 'fs';
import fastify from 'fastify';
import type { FastifyInstance, Session } from 'fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import { ENVIRONMENT, CLIENT_HOST_NAMES, IS_PRODUCTION } from './config';
import type { Environment } from './config';
import apis from './apis';
import { initDB } from './db';
import { SESSION_COOKIE_NAME } from './session';

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

  // Cookies
  const cookieSharedConfig = {
    httpOnly: IS_PRODUCTION,
    secure: IS_PRODUCTION,
    path: '/',
    maxAge: 3600 * 1000, // @TODO: add session length as a system setting
  };
  await app.register(cookie);
  const sessionStore: { [k: string]: unknown } = {};
  await app.register(fastifySession, {
    secret: 'a secret with minimum length of 32 characters', // @TODO: add SESSION_SECRET
    cookieName: SESSION_COOKIE_NAME,
    cookie: cookieSharedConfig,
    rolling: true,
    // @TODO: add session store
    store: {
      set: (sessionId, session, callback) => {
        console.log('SET TO SESSION STORE', sessionId, session.cookie.expires);
        sessionStore[sessionId] = session;
        callback();
      },
      get: (sessionId, callback) => {
        console.log('GET FROM SESSION STORE', sessionId);
        callback(null, sessionStore[sessionId] as Session);
      },
      destroy: (sessionId, callback) => {
        console.log('DESTROY SESSION STORE', sessionId);
        delete sessionStore[sessionId];
        callback();
      },
    },
  });

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

  // Client routes (all GET routes, except the GET API routes)
  app.get('*', (_, response) => response.sendFile('index.html'));

  return app;
};

export default initApp;

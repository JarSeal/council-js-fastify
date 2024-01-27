import path from 'path';
import fs from 'fs';
import {
  type FastifyBaseLogger,
  fastify as _fastify,
  type FastifyInstance as RealFastifyInstance,
} from 'fastify';
import type { Fastify } from '@fastify/restartable';
import type { FastifyInstance } from '@fastify/restartable/node_modules/fastify';
import fastifyCors from '@fastify/cors';
import fastifyStatic from '@fastify/static';
import cookie from '@fastify/cookie';
import fastifySession from '@fastify/session';
import type { TypeBoxTypeProvider } from '@fastify/type-provider-typebox';

import {
  ENVIRONMENT,
  CLIENT_HOST_NAMES,
  IS_PRODUCTION,
  SESSION_SECRET,
  SESSION_COOKIE_NAME,
  getSysSetting,
} from './config';
import type { Environment } from './config';
import apis from './apis';
import { initDB } from './db';
import { sessionStore } from './sessionStore';
import { errors } from './errors';

export const apiRoot = '/api';

type _Fastify = typeof _fastify;

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
export const fastifyOptions = {
  logger: envToLogger[ENVIRONMENT as Environment],
};

const initApp = async (fastify?: Fastify, opts?: unknown) => {
  // Fastify
  const f = fastify ? (fastify as unknown as _Fastify) : _fastify;
  const app = f(opts || fastifyOptions).withTypeProvider<TypeBoxTypeProvider>();

  // Database
  await initDB(app);

  // CORS
  await app.register(fastifyCors, {
    origin: (origin, cb) => {
      if (!origin) {
        cb(null, true);
      } else {
        const hostNameFromRequest = new URL(origin).hostname;
        const hostNameArrayFromEnv = CLIENT_HOST_NAMES.split(',').map((h) => h.trim());
        getSysSetting('allowedHostNames')
          .then((value) => {
            const sysValues = (value as string).split(',').map((h) => h.trim());
            const hostNames = [...hostNameArrayFromEnv, ...sysValues];
            if (hostNames.includes(hostNameFromRequest)) {
              cb(null, true);
            } else {
              cb(new errors.UNAUTHORIZED(`Origin not allowed: ${origin}`), false);
            }
          })
          .catch(() => cb(new Error('CORS checker failed'), false));
      }
    },
  });

  // Cookies and session
  const cookieSharedConfig = {
    httpOnly: Boolean(IS_PRODUCTION),
    secure: Boolean(IS_PRODUCTION),
    path: '/',
    maxAge: ((await getSysSetting<number>('sessionMaxAge')) || 3600) * 1000,
  };
  await app.register(cookie);
  await app.register(fastifySession, {
    secret: SESSION_SECRET,
    cookieName: SESSION_COOKIE_NAME,
    cookie: cookieSharedConfig,
    store: sessionStore,
    rolling: Boolean(await getSysSetting<boolean>('sessionIsRolling')),
  });

  // API routes
  await app.register(apis, { prefix: apiRoot });

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
  app.get('*', (_, res) => res.sendFile('index.html'));

  return app;
};

export const createRestartableApp = async (fastify: Fastify) => {
  const app = await initApp(fastify);
  return app as unknown as FastifyInstance;
};

export const restartApp = async (
  appInstance: RealFastifyInstance,
  logger?: FastifyBaseLogger,
  loggerMsg?: string
) => {
  if (appInstance && 'restart' in appInstance) {
    // @TODO: add monitor count for how many restarts there has been
    if (logger) logger.info(loggerMsg || 'Council JS (Fastify) restart');
    await (appInstance.restart as () => Promise<void>)();
  }
};

export default initApp;

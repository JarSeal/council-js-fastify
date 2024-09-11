import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import {
  type FastifyBaseLogger,
  fastify as _fastify,
  type FastifyInstance as RealFastifyInstance,
} from 'fastify';
import type { ApplicationFactory, Fastify } from '@fastify/restartable';
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
} from './config.js';
import type { Environment } from './config.js';
import apis from './apis.js';
import { initDB } from './db.js';
import { sessionStore } from './sessionStore.js';
import { errors } from './errors.js';
import { addMonitorCount } from '../utils/monitorUtils.js';
import { createIndexHtml } from './createIndexHtml.js';

export const apiRoot = '/api';

type _Fastify = typeof _fastify;

export let logger: FastifyBaseLogger;

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

  // @TODO: Cache routes
  // await cacheRoutes(session)

  // Static files
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  const publicPath = path.join(__dirname, '../../dist/public');
  if (!fs.existsSync(publicPath)) {
    throw new Error(`Could not find public path (${publicPath}), build the project first.`);
  }
  await app.register(fastifyStatic, {
    root: publicPath,
    prefix: '/public/',
  });

  // Client routes (all GET routes, except the GET API routes)
  app.get('*', createIndexHtml);

  // Export logger
  logger = app.log;

  return app;
};

export const createRestartableApp: ApplicationFactory = async (fastify: Fastify) => {
  const app = await initApp(fastify);
  return app as unknown as FastifyInstance;
};

export const restartApp = async (
  appInstance: RealFastifyInstance,
  logger?: FastifyBaseLogger,
  loggerMsg?: string
) => {
  if (appInstance && 'restart' in appInstance) {
    if (logger) logger.info(loggerMsg || 'Council JS (Fastify) restart');
    await (appInstance.restart as () => Promise<void>)();

    await addMonitorCount('appRestartCount')
      .then((result) => {
        if (result) appInstance.log.error(result);
      })
      .catch((err) => appInstance.log.error(err));
  }
};

export default initApp;

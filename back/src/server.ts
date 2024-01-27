import fastify, { type FastifyBaseLogger } from 'fastify';
import { restartable, type Fastify } from '@fastify/restartable';

import { createRestartableApp, fastifyOptions } from './core/app';
import { HOST, PORT } from './core/config';

process.env.TZ = 'UTC';

let appInstance: { [key: string]: unknown } | undefined;

restartable(createRestartableApp, fastifyOptions, fastify as unknown as Fastify)
  .then((app) => {
    app.listen(
      {
        port: PORT,
        host: HOST,
        listenTextResolver: (address) =>
          `Council JS (Fastify) back API started and listening at ${address}`,
      },
      () => {
        appInstance = app as unknown as { [key: string]: unknown };
        return null;
      }
    );
  })
  .catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error({ err }, `Council JS (Fastify) failed to start: ${JSON.stringify(err)}`);
  });

export const restartApp = async (logger?: FastifyBaseLogger, loggerMsg?: string) => {
  if (appInstance && 'restart' in appInstance) {
    if (logger) logger.info(loggerMsg || 'Council JS (Fastify) restart');
    await (appInstance.restart as () => Promise<void>)();
  }
};

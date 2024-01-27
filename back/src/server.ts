import fastify from 'fastify';
import { restartable, type Fastify } from '@fastify/restartable';

import { createRestartableApp, fastifyOptions } from './core/app';
import { HOST, PORT } from './core/config';

process.env.TZ = 'UTC';

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
        // @TODO: add monitor count for how many deploy starts there has been
      }
    );
  })
  .catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error({ err }, 'Council JS (Fastify) failed to start');
  });

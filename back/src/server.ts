import fastify from 'fastify';
import { restartable, type Fastify } from '@fastify/restartable';

import { createRestartableApp, fastifyOptions } from './core/app.js';
import { HOST, PORT } from './core/config.js';
import { addMonitorCount } from './utils/monitorUtils.js';

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
        addMonitorCount('appStartCount')
          .then((result) => {
            if (result) app.log.error(result);
          })
          .catch((err) => app.log.error(err));
      }
    );
  })
  .catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error({ err }, 'Council JS (Fastify) failed to start');
  });

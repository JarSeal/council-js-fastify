import initApp from './core/app';
import { HOST, PORT } from './core/config';

process.env.TZ = 'UTC';

initApp()
  .then((app) => {
    app.listen(
      {
        port: PORT,
        host: HOST,
        listenTextResolver: (address) => `Council JS (Fastify) back API listening at ${address}`,
      },
      () => null
    );
  })
  .catch((err: Error) => {
    // eslint-disable-next-line no-console
    console.error({ err }, 'Council JS (Fastify) failed to start');
  });

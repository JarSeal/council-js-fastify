import initApp from './core/app';
import { HOST, PORT } from './core/config'

initApp()
  .then((app) => {
    app.listen({ port: PORT, host: HOST }, () =>
      app.log.info(`Council JS (Fastify) back API listening at ${HOST}:${PORT}`)
    );
  })
  .catch((err: Error) => {
    console.error({ err }, 'Council JS (Fastify) failed to start');
  })

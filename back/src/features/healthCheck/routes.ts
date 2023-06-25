import type { FastifyPluginAsync, RouteGenericInterface } from 'fastify';

import { healthCheck } from './handlers';

export interface HealthCheckRoute extends RouteGenericInterface {
  readonly Reply: { ok: boolean };
}

const healthCheckRoute: FastifyPluginAsync = (instance) => {
  instance.route<HealthCheckRoute>({
    method: 'GET',
    url: '/health',
    handler: healthCheck,
  });

  return Promise.resolve();
};

export default healthCheckRoute;

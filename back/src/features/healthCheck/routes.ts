import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';

import { healthCheck, healthCheckDB } from './handlers';

export interface HealthCheckRoute extends RouteGenericInterface {
  readonly Reply: { ok: boolean } | FastifyError;
}

const healthCheckRoute: FastifyPluginAsync = (instance) => {
  instance.route<HealthCheckRoute>({
    method: 'GET',
    url: '/health',
    handler: healthCheck,
  });

  instance.route<HealthCheckRoute>({
    method: 'GET',
    url: '/health/db',
    handler: healthCheckDB,
  });

  return Promise.resolve();
};

export default healthCheckRoute;

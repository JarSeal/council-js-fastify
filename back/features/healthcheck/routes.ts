import type { FastifyPluginAsync } from 'fastify';

import type { HealthCheckRoute } from './schemas';
import { healthCheck } from './handlers';

const healthCheckRoute: FastifyPluginAsync = (instance) => {
  instance.route<HealthCheckRoute>({
    method: 'GET',
    url: '/health',
    handler: healthCheck,
  });

  return Promise.resolve();
};

export default healthCheckRoute;

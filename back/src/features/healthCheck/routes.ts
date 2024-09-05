import type { FastifyError, FastifyPluginAsync, RouteGenericInterface } from 'fastify';
import { Type } from '@sinclair/typebox';

import { healthCheck, healthCheckDB } from './handlers.js';

export interface HealthCheckRoute extends RouteGenericInterface {
  readonly Reply: { ok: boolean } | FastifyError;
}

const healthCheckRoute: FastifyPluginAsync = (instance) => {
  instance.route<HealthCheckRoute>({
    method: 'GET',
    url: '/health',
    handler: healthCheck,
    schema: {
      response: { 200: Type.Object({ ok: Type.Boolean() }) },
    },
  });

  instance.route<HealthCheckRoute>({
    method: 'GET',
    url: '/health/db',
    handler: healthCheckDB,
    schema: {
      response: { 200: Type.Object({ ok: Type.Boolean() }) },
    },
  });

  return Promise.resolve();
};

export default healthCheckRoute;

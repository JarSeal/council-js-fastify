import type { RouteGenericInterface } from 'fastify';

interface HealthCheckRoute extends RouteGenericInterface {
  readonly Reply: { ok: boolean };
}

export { HealthCheckRoute };

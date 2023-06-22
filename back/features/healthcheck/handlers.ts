import type { RouteHandler } from 'fastify';

import type { HealthCheckRoute } from './schemas';

export const healthCheck: RouteHandler<HealthCheckRoute> = async (_, res) => res.send({ ok: true });

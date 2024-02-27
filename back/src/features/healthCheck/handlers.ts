import type { RouteHandler } from 'fastify';

import type { HealthCheckRoute } from './routes';
import { addMonitorCount } from '../../utils/monitorUtils';

export const healthCheck: RouteHandler<HealthCheckRoute> = async (_, res) => res.send({ ok: true });

export const healthCheckDB: RouteHandler<HealthCheckRoute> = async (_, res) => {
  const addMonitorResult = await addMonitorCount('dbHealthCheck');
  if (addMonitorResult) return res.send(addMonitorResult);

  return res.send({ ok: true });
};

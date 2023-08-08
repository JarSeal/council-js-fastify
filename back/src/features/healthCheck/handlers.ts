import type { RouteHandler } from 'fastify';

import type { HealthCheckRoute } from './routes';
import Monitor from '../../models/monitor';
import type { DBMonitor } from '../../models/monitor';
import { errors } from '../../core/errors';

export const healthCheck: RouteHandler<HealthCheckRoute> = async (_, res) => res.send({ ok: true });

type DBMonitorDBHealth = DBMonitor & {
  data: { counter: number; updatedAt: Date };
};

export const healthCheckDB: RouteHandler<HealthCheckRoute> = async (_, res) => {
  const simpleId = 'healthCheckDB';
  const monitorDB = await Monitor.findOne<DBMonitorDBHealth>({ simpleId });

  if (monitorDB?.data?.counter) {
    // Update counter
    const curCounter =
      monitorDB.data.counter + 1 > Number.MAX_SAFE_INTEGER ? 0 : monitorDB.data.counter;
    const updatedMonitor = await Monitor.findOneAndUpdate<DBMonitorDBHealth>(
      { simpleId },
      { data: { counter: curCounter + 1, updatedAt: new Date() } }
    );
    if (!updatedMonitor) {
      const updateMonitorError = new errors.DB_UPDATE_MONITOR('DB health check monitor');
      return res.send(updateMonitorError);
    }
  } else {
    // Create the document
    const dbCheck = new Monitor<DBMonitorDBHealth>({
      simpleId,
      data: { counter: 1, updatedAt: new Date() },
    });
    const createdMonitor = await dbCheck.save();
    if (!createdMonitor) {
      const createMonitorError = new errors.DB_CREATE_MONITOR('DB health check monitor');
      return res.send(createMonitorError);
    }
  }

  return res.send({ ok: true });
};

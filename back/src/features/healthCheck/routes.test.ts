import type { FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import DBMonitorModel from '../../dbModels/monitor';
import type { DBMonitorCounter } from '../../utils/monitorUtils';

describe('healthCheck', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should test the healthCheck api route', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true });
  });

  it('should test the healthCheckDB api route', async () => {
    const simpleId = 'dbHealthCheck';
    let monitorDB = await DBMonitorModel.findOne<DBMonitorCounter>({ simpleId });
    expect(monitorDB).toBe(null);

    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/health/db',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true });

    monitorDB = await DBMonitorModel.findOne<DBMonitorCounter>({ simpleId });
    expect(monitorDB?.systemDocument).toBeTruthy();
    expect(monitorDB?.data.counter).toEqual(1);

    await app.inject({
      method: 'GET',
      path: '/api/v1/sys/health/db',
    });
    monitorDB = await DBMonitorModel.findOne<DBMonitorCounter>({ simpleId });
    expect(monitorDB?.data.counter).toEqual(2);
  });
});

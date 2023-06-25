import type { FastifyInstance } from 'fastify';

import initApp from '../../core/app';

describe('healthCheck', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should test the healthCheck api route', async () => {
    const response = await app.inject({
      method: 'GET',
      path: '/api/v1/sys/health',
    });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ ok: true });
  });
});

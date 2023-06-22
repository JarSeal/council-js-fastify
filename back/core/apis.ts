import type { FastifyPluginAsync } from 'fastify';

import { testHook } from '../hooks/testHook/testHook';
import healthCheckRoute from '../features/healthcheck/routes';

const apiVersion = '/v1';
const vPrefixObj = { prefix: apiVersion };

// All routes:
const apis: FastifyPluginAsync = async (instance) => {
  await instance.register(publicRoutes);
};

const publicRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', testHook(instance));
  await instance.register(healthCheckRoute, vPrefixObj);
};

export default apis;

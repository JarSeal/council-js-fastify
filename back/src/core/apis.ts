import type { FastifyPluginAsync } from 'fastify';

import { testHook } from '../hooks/testHook/testHook';
import healthCheckRoute from '../features/healthCheck/routes';
import publicSignUpRoute from '../features/publicSignUp/routes';

const apiVersion = '/v1';
const vPrefixObj = { prefix: apiVersion };
const sysPrefixObj = { prefix: apiVersion + '/sys' };

// All routes:
const apis: FastifyPluginAsync = async (instance) => {
  await instance.register(publicRoutes);
  await instance.register(notSignedInRoutes);
};

const publicRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', testHook(instance)); // @TODO: remove this example hook at some point
  await instance.register(healthCheckRoute, sysPrefixObj);
};

const notSignedInRoutes: FastifyPluginAsync = async (instance) => {
  // @TODO: Add a hook here to check that user is not signed to use these apis
  await instance.register(publicSignUpRoute, vPrefixObj);
};

export default apis;

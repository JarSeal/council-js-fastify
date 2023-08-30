import type { FastifyPluginAsync } from 'fastify';

import { testHook } from '../hooks/testHook/testHook';
import healthCheckRoute from '../features/healthCheck/routes';
import publicSignUpRoute from '../features/publicSignUp/routes';
import loginRoute from '../features/login/routes';
import { notSignedInHook } from '../hooks/notSignedIn';
import { checkSessionHook } from '../hooks/checkSession';

const apiVersion = '/v1';
const vPrefixObj = { prefix: apiVersion };
const sysPrefixObj = { prefix: apiVersion + '/sys' };

// All routes:
const apis: FastifyPluginAsync = async (instance) => {
  await instance.register(publicRoutes);

  instance.addHook('preHandler', checkSessionHook);
  await instance.register(notSignedInRoutes);
};

// Public routes:
const publicRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', testHook); // @TODO: remove this example hook at some point
  await instance.register(healthCheckRoute, sysPrefixObj);
};

// Not signed in routes:
const notSignedInRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', notSignedInHook);
  await instance.register(publicSignUpRoute, vPrefixObj);
  await instance.register(loginRoute, vPrefixObj);
};

export default apis;

import type { FastifyPluginAsync } from 'fastify';

import healthCheckRoute from '../features/healthCheck/routes';
import publicSignUpRoute from '../features/publicSignUp/routes';
import loginRoute from '../features/login/routes';
import logoutRoute from '../features/logout/routes';
import { notSignedInHook } from '../hooks/notSignedIn';
import { signedInHook } from '../hooks/signedIn';

const apiVersion = '/v1';
const vPrefixObj = { prefix: apiVersion };
const sysPrefixObj = { prefix: apiVersion + '/sys' };

// All routes:
const apis: FastifyPluginAsync = async (instance) => {
  await instance.register(publicRoutes);
  await instance.register(notSignedInRoutes);
  await instance.register(signedInRoutes);
};

// Public routes:
const publicRoutes: FastifyPluginAsync = async (instance) => {
  await instance.register(healthCheckRoute, sysPrefixObj);
};

// Not signed in routes:
const notSignedInRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', notSignedInHook);
  await instance.register(publicSignUpRoute, vPrefixObj);
  await instance.register(loginRoute, vPrefixObj);
};

// Signed in routes:
// *****************
const signedInRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', signedInHook);
  await instance.register(logoutRoute, vPrefixObj);
};

export default apis;

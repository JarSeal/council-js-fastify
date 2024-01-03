import type { FastifyPluginAsync } from 'fastify';

import healthCheckRoutes from '../features/healthCheck/routes';
import publicSignUpRoute from '../features/publicSignUp/routes';
import loginRoutes from '../features/login/routes';
import logoutRoute from '../features/logout/routes';
import formDataRoutes from '../features/formData/routes';
import { notSignedInHook } from '../hooks/notSignedIn';
import { signedInHook } from '../hooks/signedIn';
import { csrfHook } from '../hooks/csrf';

export const apiVersion = '/v1';
const vPrefixObj = { prefix: apiVersion };
const sysPrefixObj = { prefix: apiVersion + '/sys' };

// All API routes:
const apis: FastifyPluginAsync = async (instance) => {
  await instance.register(publicRoutes);
  await instance.register(stateAlteringSystemRoutes);
};

// Public system API routes:
const publicRoutes: FastifyPluginAsync = async (instance) => {
  await instance.register(formDataRoutes);
  await instance.register(healthCheckRoutes, sysPrefixObj);
};

// All state altering system API routes (check CSRF header)
const stateAlteringSystemRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', csrfHook);
  await instance.register(notSignedInSystemRoutes);
  await instance.register(signedInSystemRoutes);
};

// Not signed in system API routes:
const notSignedInSystemRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', notSignedInHook);
  await instance.register(publicSignUpRoute, vPrefixObj);
  await instance.register(loginRoutes, vPrefixObj);
};

// Signed in system API routes:
// *****************
const signedInSystemRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', signedInHook);
  await instance.register(logoutRoute, vPrefixObj);
};

export default apis;

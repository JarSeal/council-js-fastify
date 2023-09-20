import type { FastifyPluginAsync } from 'fastify';

import healthCheckRoute from '../features/healthCheck/routes';
import publicSignUpRoute from '../features/publicSignUp/routes';
import loginRoute from '../features/login/routes';
import logoutRoute from '../features/logout/routes';
import customRoute from '../features/custom/routes';
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
  await instance.register(customRoute); // WIP
  await instance.register(healthCheckRoute, sysPrefixObj);
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
  await instance.register(loginRoute, vPrefixObj);
};

// Signed in system API routes:
// *****************
const signedInSystemRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', signedInHook);
  // @TODO: add here the authorization check hook
  await instance.register(logoutRoute, vPrefixObj); // @CONSIDER: maybe move this to public and return false if not signed in
};

export default apis;

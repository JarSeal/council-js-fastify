import type { FastifyPluginAsync } from 'fastify';

import healthCheckRoutes from '../features/healthCheck/routes.js';
import publicSignUpRoute from '../features/publicSignUp/routes.js';
import loginRoutes from '../features/login/routes.js';
import logoutRoute from '../features/logout/routes.js';
import formDataRoutes from '../features/formData/routes.js';
import systemSettingsRoutes from '../features/systemSettings/routes.js';
import { userPublicRoutes, userSignedInRoutes } from '../features/user/routes.js';
import { signedInHook } from '../hooks/signedIn.js';
import { notSignedInHook } from '../hooks/notSignedIn.js';
import { csrfHook } from '../hooks/csrf.js';
import { clientDataHook } from '../hooks/clientData.js';

export const apiVersion = '/v1';
const sysPrefixObj = { prefix: apiVersion + '/sys' };

// All API routes:
const apis: FastifyPluginAsync = async (instance) => {
  instance.addHook('preSerialization', clientDataHook);
  await instance.register(publicRoutes);
  await instance.register(stateAlteringSystemRoutes);
};

// Public system API routes:
const publicRoutes: FastifyPluginAsync = async (instance) => {
  await instance.register(formDataRoutes);
  await instance.register(healthCheckRoutes, sysPrefixObj);
  await instance.register(logoutRoute, sysPrefixObj);
  await instance.register(userPublicRoutes, sysPrefixObj);
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
  await instance.register(publicSignUpRoute, sysPrefixObj);
  await instance.register(loginRoutes, sysPrefixObj);
};

// Signed in system API routes:
// *****************
const signedInSystemRoutes: FastifyPluginAsync = async (instance) => {
  instance.addHook('onRequest', signedInHook);
  await instance.register(systemSettingsRoutes, sysPrefixObj);
  await instance.register(userSignedInRoutes, sysPrefixObj);
};

export default apis;

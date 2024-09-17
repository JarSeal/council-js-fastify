import type { FastifyPluginAsync } from 'fastify';

import healthCheckRoutes from '../features/healthCheck/routes';
import publicSignUpRoute from '../features/publicSignUp/routes';
import loginRoutes from '../features/login/routes';
import logoutRoute from '../features/logout/routes';
import formDataRoutes from '../features/formData/routes';
import systemSettingsRoutes from '../features/systemSettings/routes';
import { userPublicRoutes, userSignedInRoutes } from '../features/user/routes';
import { signedInHook } from '../hooks/signedIn';
import { notSignedInHook } from '../hooks/notSignedIn';
import { csrfHook } from '../hooks/csrf';
import { clientDataHook } from '../hooks/clientData';

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

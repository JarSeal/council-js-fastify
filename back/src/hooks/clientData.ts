import type { FastifyReply, FastifyRequest } from 'fastify';

export const clientDataHook = (
  _req: FastifyRequest,
  _res: FastifyReply,
  payload: { [key: string]: unknown }
) => {
  // @TODO: get requiredActions data
  const requiredActions = null;

  // @TODO: get publicSettings data
  const publicSettings = {};

  // @TODO: get client routes data
  const routes = [
    {
      path: '/sys/login',
      componentId: 'sysLoginView',
      meta: { title: 'Login' },
    },
  ];

  return Promise.resolve({
    ...payload,
    $clientData: { requiredActions, publicSettings, routes },
  });
};

import type { RouteHandler } from 'fastify';

import type { CustomPostRoute } from './routes';

export const customPost: RouteHandler<CustomPostRoute> = async (_, res) => {
  // @TODO: get current form data
  // @TODO: check CSRF header (if enabled in form data)
  // @TODO: check authorization
  // @TODO: validate incoming body fields against the form data

  console.log('TADAAAAAAAAAAA');
  return res.send({ ok: true });
};

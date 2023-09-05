import type { RouteHandler } from 'fastify';

import type { LogoutRoute } from './schemas';

export const logout: RouteHandler<LogoutRoute> = async (req, res) => {
  await req.session.destroy();
  return res.status(200).send({ ok: true });
};

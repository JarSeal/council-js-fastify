import type { RouteHandler } from 'fastify';

import type { LogoutRoute } from './schemas';
import { errors } from '../../core/errors';

export const logout: RouteHandler<LogoutRoute> = async (req, res) => {
  if (!req.session?.isSignedIn) {
    return res.send(new errors.UNAUTHORIZED('Must be signed in'));
  }

  await req.session.destroy();
  return res.status(200).send({ ok: true });
};

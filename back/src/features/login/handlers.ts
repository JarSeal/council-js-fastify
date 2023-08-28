import type { RouteHandler } from 'fastify';

import type { LoginRoute } from './schemas';

export const login: RouteHandler<LoginRoute> = async (req, res) => {
  const body = req.body;
  const usernameOrEmail = body.usernameOrEmail.trim();
  const pass = body.pass.trim();
  console.log('LOGIN BODY', usernameOrEmail, pass, req.session.isSignedIn);

  req.session.isSignedIn = true;
  req.session.username = usernameOrEmail;

  return res.status(200).send({ ok: true });
};

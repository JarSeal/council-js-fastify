import type { RouteHandler } from 'fastify';

import type { LoginRoute } from './schemas';
// import { sendWithSessionCookie } from '../../core/session';

export const login: RouteHandler<LoginRoute> = async (req, res) => {
  const body = req.body;
  const usernameOrEmail = body.usernameOrEmail.trim();
  const pass = body.pass.trim();
  //const result = req.unsignCookie(SESSION_COOKIE_NAME);
  console.log('LOGIN BODY', usernameOrEmail, pass, req.session.sessionId);
  // return sendWithSessionCookie(res, { ok: true });
  return res.status(200).send({ ok: true });
};

import type { RouteHandler } from 'fastify';
import bcrypt from 'bcrypt';

import type { LoginRoute } from './schemas';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import { errors } from '../../core/errors';

export const login: RouteHandler<LoginRoute> = async (req, res) => {
  const body = req.body;
  const usernameOrEmail = body.usernameOrEmail.trim();
  const loginMethod = 'username'; // @TODO: add option to log with primary email
  const pass = body.pass.trim();

  // Find user
  const user =
    loginMethod === 'username'
      ? await DBUserModel.findOne<DBUser>({ simpleId: usernameOrEmail })
      : null;
  if (!user) {
    return res.send(new errors.LOGIN_USER_OR_PASS_WRONG());
  }

  // Check password
  const passCorrect = await bcrypt.compare(pass, user.passwordHash);
  if (!passCorrect) {
    return res.send(new errors.LOGIN_USER_OR_PASS_WRONG());
  }

  req.session.isSignedIn = true;
  req.session.username = user.simpleId;
  req.session.userId = String(user.id);

  return res.status(200).send({ ok: true });
};

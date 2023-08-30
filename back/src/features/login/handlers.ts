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

  const getUsernameOrPassWrongError = () =>
    new errors.UNAUTHORIZED('Username and/or password wrong');

  // Find user
  const user =
    loginMethod === 'username'
      ? await DBUserModel.findOne<DBUser>({ simpleId: usernameOrEmail }).lean()
      : null;
  if (!user) {
    return res.send(getUsernameOrPassWrongError());
  }

  // Check password
  const passCorrect = await bcrypt.compare(pass, user.passwordHash);
  if (!passCorrect) {
    return res.send(getUsernameOrPassWrongError());
  }

  req.session.isSignedIn = true;
  req.session.username = usernameOrEmail;
  console.log('SESS COOKIE', req.session.cookie);
  // await req.session.save();

  return res.status(200).send({ ok: true });
};

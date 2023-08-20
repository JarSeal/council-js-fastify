import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';

import { errors } from '../../core/errors';
import { validatePublicSignup } from '../utils/validation';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import type { PublicSignUpRoute } from './schemas';
import { SECRET } from '../../core/config';

export const publicSignUp: RouteHandler<PublicSignUpRoute> = async (req, res) => {
  const body = req.body;
  const email = body.email.trim();

  // Validate fields
  const username = body.username.trim();
  const foundUser = await DBUserModel.findOne<DBUser>({ simpleId: username }).lean();
  const validateError = validatePublicSignup(body, foundUser);
  if (validateError) {
    return res.send(validateError);
  }
  const foundEmail = await DBUserModel.findOne<DBUser>({ 'emails.email': email }).lean();
  if (foundEmail) {
    return res.send(new errors.EMAIL_TAKEN(email));
  }

  // Create new user
  const passwordHash = await hash(body.pass, 10);
  const partialHash = passwordHash.slice(-8);
  const dateEmailCreated = new Date().getTime() / 1000; // in seconds
  const hashToken = await hash(`${username}__email0__${SECRET}__${partialHash}`, 4);
  const emailVerificationToken = `${dateEmailCreated}---${hashToken}`;
  const user = new DBUserModel<DBUser>({
    simpleId: username,
    emails: [{ email, verified: false, token: emailVerificationToken }],
    passwordHash,
    created: {
      user: null,
      publicForm: true,
      date: new Date(),
    },
    edited: [],
  });

  const savedUser = await user.save();

  if (!savedUser) {
    const createUserError = new errors.DB_CREATE_NEW_USER('public sign up user saving failed');
    return res.send(createUserError);
  }

  return res.status(200).send({ ok: true });
};

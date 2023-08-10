import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';

import { errors } from '../../core/errors';
import { validatePublicSignup } from '../utils/validation';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import type { PublicSignUpRoute } from './schemas';

export const publicSignUp: RouteHandler<PublicSignUpRoute> = async (req, res) => {
  const body = req.body;
  const email = body.email.trim();

  // Check if email already exists

  // Validate fields
  const username = body.username.trim();
  const foundUser = await DBUserModel.findOne<DBUser>({ simpleId: username });
  const validateError = validatePublicSignup(body, foundUser);
  if (validateError) {
    return res.send(validateError);
  }

  // Create new user
  const passwordHash = await hash(body.pass, 10);
  const user = new DBUserModel<DBUser>({
    simpleId: username,
    emails: [{ email, verified: false }],
    passwordHash,
    created: {
      user: null,
      publicForm: true,
      date: new Date(),
    },
    edited: [],
  });

  const savedUser = await user.save();

  req.log.info(`savedUser: ${JSON.stringify(savedUser)}`); // @TEMP

  if (!savedUser) {
    const createUserError = new errors.DB_CREATE_NEW_USER('public sign up user saving failed');
    return res.send(createUserError);
  }

  return res.status(200).send({ ok: true });
};

import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';

import type { PublicSignUpRoute } from './schemas';
import { validatePublicSignupBody, dbCreateNewUserError } from '../utils/validation';
import User from '../../models/user';

export const publicSignUp: RouteHandler<PublicSignUpRoute> = async (req, res) => {
  const body = req.body;
  const validate = validatePublicSignupBody(body);
  // @TODO: Check here if user is logged in
  // @TODO: Check here if user already exists
  if (validate.error) {
    return res.status(validate.status).send({ ok: false, error: validate });
  }

  // Create new user
  const email = body.email.trim();
  const passwordHash = await hash(body.pass, 10);
  const user = new User({
    simpleId: body.username.trim(),
    emails: [{ email }],
    passwordHash,
    created: {
      by: null,
      publicForm: true,
      date: new Date(),
    },
  });

  const savedUser = await user.save();

  req.log.info(`savedUser: ${JSON.stringify(savedUser)}`); // @TEMP

  if (!savedUser) {
    req.log.error(JSON.stringify(dbCreateNewUserError));
    return res.status(dbCreateNewUserError.status).send({ ok: false, error: dbCreateNewUserError });
  }

  return res.status(200).send({ ok: true });
};

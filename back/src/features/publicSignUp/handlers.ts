import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';

import { errors } from '../../core/errors';
import { validatePublicSignup } from '../../utils/validation';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import type { PublicSignUpRoute } from './schemas';
import { HASH_SALT_ROUNDS } from '../../core/config';
import { createUrlTokenAndId } from '../../utils/token';

export const publicSignUp: RouteHandler<PublicSignUpRoute> = async (req, res) => {
  const body = req.body;
  const email = body.email.trim();
  const username = body.username.trim();

  // Validate fields
  const foundUser = await DBUserModel.findOne<DBUser>({ simpleId: username }).lean();
  const validateError = validatePublicSignup(body, foundUser);
  if (validateError) {
    return res.send(validateError);
  }
  const foundEmail = await DBUserModel.findOne<DBUser>({ 'emails.email': email }).lean();
  if (foundEmail) {
    return res.send(new errors.EMAIL_TAKEN(email));
  }

  // Create email verification URL ID token
  const tokenAndId = await createUrlTokenAndId('EMAIL_VERIFICATION');
  if (tokenAndId.error) {
    return res.send(
      new errors.FAST_JWT_ERR(`${tokenAndId.error.code}: ${tokenAndId.error.message}`)
    );
  }

  // Create new user
  const dateNow = new Date();
  const saltRounds = Number(HASH_SALT_ROUNDS);
  const passwordHash = await hash(body.pass, saltRounds);
  const user = new DBUserModel<DBUser>({
    simpleId: username,
    emails: [
      {
        email,
        verified: false,
        token: { token: tokenAndId.token, tokenId: tokenAndId.tokenId },
        added: dateNow,
      },
    ],
    passwordHash,
    created: {
      user: null,
      publicForm: true,
      date: dateNow,
    },
    edited: [],
    security: { lastLogins: [], lastLoginAttempts: [] },
  });

  let savedUser, error;
  try {
    savedUser = await user.save();
  } catch (err) {
    error = `PublicSignUp: saving user model failed: ${JSON.stringify(err)}`;
  }
  if (!savedUser || error) {
    const createUserError = new errors.DB_CREATE_NEW_USER(error || 'savedUser returned empty');
    return res.send(createUserError);
  }

  return res.status(200).send({ ok: true });
};

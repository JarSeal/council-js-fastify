import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';
import crypto from 'crypto';

import { errors } from '../../core/errors';
import { validatePublicSignup } from '../utils/validation';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import type { PublicSignUpRoute } from './schemas';
import { HASH_SALT_ROUNDS } from '../../core/config';
import { createUrlToken } from '../utils/token';

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

  // Create email verification token and id
  const emailVerificationTokenId = crypto.randomUUID();
  const emailVerificationToken = await createUrlToken({
    tokenType: 'EMAIL_VERIFICATION',
    tokenId: emailVerificationTokenId,
  });
  if (typeof emailVerificationToken !== 'string') {
    return res.send(
      new errors.FAST_JWT_ERR(`${emailVerificationToken.code}: ${emailVerificationToken.message}`)
    );
  }

  // Create new user
  const dateNow = new Date();
  const saltRounds = HASH_SALT_ROUNDS;
  const passwordHash = await hash(body.pass, saltRounds);
  const user = new DBUserModel<DBUser>({
    simpleId: username,
    emails: [
      {
        email,
        verified: false,
        token: { token: emailVerificationToken, tokenId: emailVerificationTokenId },
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
  });

  let savedUser, error;
  try {
    savedUser = await user.save();
  } catch (err) {
    req.log.error(`PublicSignUp: saving user model failed: ${JSON.stringify(err)}`);
  }
  if (!savedUser || error) {
    if (!savedUser) req.log.error(`PublicSignUp: savedUser was empty`);
    const createUserError = new errors.DB_CREATE_NEW_USER('public sign up user saving failed');
    return res.send(createUserError);
  }

  return res.status(200).send({ ok: true });
};

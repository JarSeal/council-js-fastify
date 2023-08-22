import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';
import crypto from 'crypto';

import { errors } from '../../core/errors';
import { validatePublicSignup } from '../utils/validation';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import type { PublicSignUpRoute } from './schemas';
import { getConfig } from '../../core/config';
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
  const emailVerificationToken = await createUrlToken({ emailVerificationTokenId });
  if (typeof emailVerificationToken !== 'string') {
    return res.send(
      new errors.FAST_JWT_ERR(`${emailVerificationToken.code}: ${emailVerificationToken.message}`)
    );
  }

  // Create new user
  const saltRounds = getConfig<number>('user.hashSaltRounds', 10);
  const passwordHash = await hash(body.pass, saltRounds);
  const user = new DBUserModel<DBUser>({
    simpleId: username,
    emails: [
      {
        email,
        verified: false,
        token: { token: emailVerificationToken, tokenId: emailVerificationTokenId },
      },
    ],
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

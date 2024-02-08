import type { RouteHandler } from 'fastify';
import { hash } from 'bcrypt';

import { errors } from '../../core/errors';
import { validateFormDataInput } from '../../utils/validation';
import DBUserModel from '../../dbModels/user';
import type { DBUser } from '../../dbModels/user';
import type { PublicSignUpRoute } from './schemas';
import { HASH_SALT_ROUNDS, getAppName } from '../../core/config';
import { createUrlTokenAndId } from '../../utils/token';
import DBFormModel, { type DBForm } from '../../dbModels/form';
import { sendEmail } from '../../core/email';

export const publicSignUp: RouteHandler<PublicSignUpRoute> = async (req, res) => {
  const body = req.body;
  const email = body.email.trim();
  const username = body.username.trim();

  // Check if username is taken
  const foundUser = await DBUserModel.findOne<DBUser>({ simpleId: username }).lean();
  if (foundUser) {
    return res.send(new errors.USERNAME_TAKEN(username));
  }

  // Check if email is taken
  const foundEmail = await DBUserModel.findOne<DBUser>({ 'emails.email': email }).lean();
  if (foundEmail) {
    return res.send(new errors.EMAIL_TAKEN(email));
  }

  // Get form and validate input
  const publicSignUpForm = await DBFormModel.findOne<DBForm>({ simpleId: 'publicSignUp' });
  const formData = [
    {
      elemId: 'username',
      value: username,
    },
    {
      elemId: 'email',
      value: email,
    },
    {
      elemId: 'emailAgain',
      value: body.emailAgain,
    },
    {
      elemId: 'pass',
      value: body.pass,
    },
    {
      elemId: 'passAgain',
      value: body.passAgain,
    },
  ];
  const validateError = validateFormDataInput(publicSignUpForm?.form.formElems || [], formData);
  if (validateError) {
    return res.status(validateError.status).send({ ok: false, error: validateError });
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
    security: { lastLogins: [], lastLoginAttempts: [], twoFA: { code: null, date: null } },
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

  await sendEmail({
    to: email,
    templateId: 'welcomeEmail',
    templateVars: {
      appName: await getAppName(),
      username,
      sysLoginUrl: 'http://localhost:4004', // @TODO: change this to come from a setting
      newPassRequestUrl: 'http://localhost:4004', // @TODO: change this to come from a setting
    },
  });

  return res.status(200).send({ ok: true });
};

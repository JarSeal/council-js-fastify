import type { RouteHandler } from 'fastify';

import type {
  ResetPasswordRoute,
  SendNewPasswordRoute,
  SendVerificationEmailRoute,
  VerifyEmailRoute,
} from './routes';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import { errors } from '../../core/errors';
import {
  AUDIENCE,
  ISSUER,
  SUBJECT_URL_TOKEN,
  createUrlTokenAndId,
  verifyUrlToken,
} from '../../utils/token';
import { updateDBUser } from '../login/handlers';
import { MAX_FORGOT_PASSWORD_RESENDS, getAppName, getSysSetting } from '../../core/config';
import { sendEmail } from '../../core/email';
import { csrfCheck } from '../../hooks/csrf';
import { isEmailEnabled } from '../../utils/common';
import { getTimestampFromDate } from '../../utils/timeAndDate';

// VERIFY EMAIL ROUTE
// ********************************
export const verifyEmail: RouteHandler<VerifyEmailRoute> = async (req, res) => {
  const csrfError = csrfCheck(req);
  if (csrfError) {
    return res.send(csrfError);
  }

  const token = req.query.token;
  if (!token) {
    return res.send(new errors.TOKEN_NOT_FOUND('Verification token cannot be empty'));
  }

  // Find user
  const user = await DBUserModel.findOne<DBUser>({ 'emails.token.token': token });
  if (!user) {
    return res.send(new errors.TOKEN_NOT_FOUND('Could not find email verification token.'));
  }

  const emails = user.emails;
  const emailIndex = emails.findIndex((item) => item.token.token === token);
  const curEmailToken = emails[emailIndex].token;

  const verification = await verifyUrlToken(token);
  const payloadTokenId = verification.tokenId as string | undefined;
  if (
    curEmailToken.tokenId !== payloadTokenId ||
    verification.iss !== ISSUER ||
    verification.aud !== AUDIENCE ||
    verification.sub !== SUBJECT_URL_TOKEN
  ) {
    // token verification failed
    let tokenIdWrong = false;
    if (curEmailToken.tokenId !== payloadTokenId) tokenIdWrong = true;
    return res.send(
      new errors.TOKEN_INVALID_ERR(
        `Verify email token was invalid ${tokenIdWrong ? '(tokenId wrong) ' : ''} iss: ${String(
          verification.iss
        )}, aud: ${String(verification.aud)}, sub: ${String(verification.sub)})`
      )
    );
  }

  // Set current email as verified to DBUser
  emails[emailIndex].verified = true;
  emails[emailIndex].token.token = null;
  emails[emailIndex].token.tokenId = null;
  const updateError = await updateDBUser(
    { simpleId: user.simpleId },
    { emails },
    'User email verification'
  );
  if (updateError) return res.send(updateError);

  return res.send({ ok: true });
};

// SEND NEW VERIFICATION EMAIL ROUTE
// ********************************
export const sendVerificationEmail: RouteHandler<SendVerificationEmailRoute> = async (req, res) => {
  const emailIndex = req.params.emailIndex;

  if (
    emailIndex === undefined ||
    isNaN(emailIndex) ||
    !req.session.isSignedIn ||
    !req.session.userId
  ) {
    return res.send(
      new errors.NOT_FOUND(
        'Either emailIndex is not specified or is not a number, or user is not in a session (send verification email).'
      )
    );
  }

  const emailIsTurnedOn = await isEmailEnabled();
  if (!emailIsTurnedOn) {
    return res.send(
      new errors.FEATURE_DISABLED(
        'Email sending is turned off in the system settings (send verification email).'
      )
    );
  }

  // Find user
  const user = await DBUserModel.findById<DBUser>(req.session.userId);
  if (!user) {
    return res.send(new errors.NOT_FOUND('User not found for "send verification email".'));
  }

  if (!user.emails[emailIndex]) {
    return res.send(
      new errors.BAD_REQUEST(`Could not find an email with emailIndex ${emailIndex}.`)
    );
  }

  // Create email verification URL ID token
  const tokenAndId = await createUrlTokenAndId('EMAIL_VERIFICATION');
  if (tokenAndId.error) {
    return res.send(
      new errors.FAST_JWT_ERR(`${tokenAndId.error.code}: ${tokenAndId.error.message}`)
    );
  }

  // Update user
  const emails = user.emails;
  emails[emailIndex].token = { token: tokenAndId.token, tokenId: tokenAndId.tokenId };
  const updateError = await updateDBUser(
    { simpleId: user.simpleId },
    { emails },
    `Send verification email updateDBUser failed, update email token (emailIndex: ${emailIndex}).`
  );
  if (updateError) return updateError;

  const email = user.emails[emailIndex].email;
  await sendEmail({
    to: email,
    templateId: 'verifyEmail',
    templateVars: {
      appName: await getAppName(),
      username: user.simpleId,
      verifyEmailUrl: `http://localhost:4004?token=${tokenAndId.token}`, // @TODO: change this URL to come from a setting
    },
  });

  return res.send({ ok: true });
};

// FORGOT PASSWORD ROUTE
// ********************************
export const forgotPassword: RouteHandler<SendNewPasswordRoute> = async (req, res) => {
  // @TODO or @CONSIDER: get csrf from the form and check if it needed and present
  const csrfError = csrfCheck(req);
  if (csrfError) {
    return res.send(csrfError);
  }

  // Check if email is enabled
  const emailIsTurnedOn = await isEmailEnabled();
  if (!emailIsTurnedOn) {
    return res.send(
      new errors.FEATURE_DISABLED(
        'Email sending is turned off in the system settings (send new password link email).'
      )
    );
  }

  const defaultReturnBody = { ok: true };
  const email = req.body.email;
  const username = req.body.username;
  const method = (await getSysSetting<string>('forgotPassIdMethod')) || 'DISABLED';
  const emailRequired = method === 'EMAIL_ONLY' || method === 'BOTH_REQUIRED';
  const usernameRequired = method === 'USERNAME_ONLY' || method === 'BOTH_REQUIRED';

  // Check the password link requirements
  if (method === 'DISABLED') {
    return res.send(new errors.FEATURE_DISABLED('Forgot password feature is disabled.'));
  } else if (emailRequired && !email) {
    return res.send(
      new errors.BAD_REQUEST('Email is missing from forgot password request (email is required)')
    );
  } else if (usernameRequired && !username) {
    return res.send(
      new errors.BAD_REQUEST(
        'Username is missing from forgot password request (username is required)'
      )
    );
  } else if (!username && !email) {
    return res.send(
      new errors.BAD_REQUEST('Username an/or email are missing from forgot password request')
    );
  }

  // Find user
  const user = await DBUserModel.findOne<DBUser>(
    username ? { simpleId: username } : { 'emails.0.email': email }
  );
  if (
    !user ||
    (emailRequired && user?.emails[0].email !== email) ||
    (usernameRequired && user?.simpleId !== username)
  ) {
    // Log attempts
    if (!user) {
      req.log.info('User not found in forgot pass request.');
    } else {
      if (emailRequired && user?.emails[0].email !== email) {
        req.log.info('Email not found in forgot pass request.');
      }
      if (usernameRequired && user?.simpleId !== username) {
        req.log.info('Username not found in forgot pass request.');
      }
    }
    // Do not tell if the user, username, or email is found or not, just return default
    return res.send(defaultReturnBody);
  }

  // Check possible current token and if it is still valid
  let sentCount = 1;
  if (user.security.newPassToken?.token) {
    const oldToken = await verifyUrlToken(user.security.newPassToken.token);
    const expires = oldToken.expires as number | undefined;
    if (getTimestampFromDate(new Date()) < (expires || 0)) {
      const curSentCount = (oldToken.sentCount as number | undefined) || 1;
      if (curSentCount >= MAX_FORGOT_PASSWORD_RESENDS) {
        req.log.info(`Forgot password max resends full (${MAX_FORGOT_PASSWORD_RESENDS}).`);
        return res.send(defaultReturnBody);
      }
      sentCount = curSentCount + 1;
    }
  }

  // Create new password URL ID token
  const linkLifeInMinutes = (await getSysSetting<number>('forgotPassSessionAgeInMin')) || 30;
  const expires = getTimestampFromDate(new Date()) + linkLifeInMinutes * 60;
  const tokenAndId = await createUrlTokenAndId('RESET_PASSWORD', { expires, sentCount });
  if (tokenAndId.error) {
    return res.send(
      new errors.FAST_JWT_ERR(`${tokenAndId.error.code}: ${tokenAndId.error.message}`)
    );
  }

  // Update user
  const security = user.security;
  security.newPassToken = tokenAndId;
  const updateError = await updateDBUser(
    { simpleId: user.simpleId },
    { security },
    `Forgot password updateDBUser failed, update security.newPassToken.`
  );
  if (updateError) return updateError;

  // Send email
  await sendEmail({
    to: user.emails[0].email,
    templateId: 'newPassLinkEmail',
    templateVars: {
      appName: await getAppName(),
      username: user.simpleId,
      newPassUrl: `http://localhost:4004?token=${tokenAndId.token}`, // @TODO: change this URL to come from a setting
      linkLifeInMinutes,
    },
  });

  return res.send(defaultReturnBody);
};

// RESET PASSWORD ROUTE
// ********************************
export const resetPassword: RouteHandler<ResetPasswordRoute> = async (req, res) => {
  req;

  return res.send({ ok: true });
};

import type { RouteHandler } from 'fastify';

import type { SendVerificationEmailRoute, VerifyEmailRoute } from './routes';
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
import { getAppName, getSysSetting } from '../../core/config';
import { sendEmail } from '../../core/email';

// VERIFY EMAIL ROUTE
// ********************************
export const verifyEmail: RouteHandler<VerifyEmailRoute> = async (req, res) => {
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

// SEND VERIFICATION EMAIL ROUTE
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

  const emailIsTurnedOn = await getSysSetting<boolean>('useEmail');
  if (!emailIsTurnedOn) {
    return res.send(
      new errors.BAD_REQUEST(
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

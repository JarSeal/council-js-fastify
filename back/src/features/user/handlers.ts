import type { RouteHandler } from 'fastify';

import type { VerifyEmailRoute } from './routes';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import { errors } from '../../core/errors';
import { AUDIENCE, ISSUER, SUBJECT_URL_TOKEN, verifyUrlToken } from '../../utils/token';
import { updateDBUser } from '../login/handlers';

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

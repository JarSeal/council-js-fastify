import type { FastifyError } from 'fastify';

import type { PublicSignUpRoute } from '../publicSignUp/schemas';
import { errors } from '../../core/errors';
import type { DBUser } from '../../models/user';

export type ValidationError = FastifyError | null;

export const validatePublicSignup = (
  body: PublicSignUpRoute['Body'],
  foundUser: DBUser | null
): ValidationError => {
  const username = body.username.trim();
  const pass = body.pass.trim();

  if (foundUser) {
    return new errors.USERNAME_TAKEN(username);
  }

  // Check lengths
  const minUserLength = 2; // @TODO: add config param for the length
  if (username.length < minUserLength) {
    return new errors.VALIDATE_NEW_USER(
      `Username is too short, minimum is ${minUserLength} characters.`
    );
  }
  const maxUserLength = 16; // @TODO: add config param for the length
  if (username.length > maxUserLength) {
    return new errors.VALIDATE_NEW_USER(
      `Username is too long, maximum is ${maxUserLength} characters.`
    );
  }
  const minPassLength = 8; // @TODO: add config param for the length
  if (pass.length < minPassLength) {
    return new errors.VALIDATE_NEW_USER(
      `Password is too short, minimum is ${minPassLength} characters.`
    );
  }
  const maxPassLength = 64; // @TODO: add config param for the length
  if (pass.length > maxPassLength) {
    return new errors.VALIDATE_NEW_USER(
      `Password is too long, maximum is ${maxPassLength} characters.`
    );
  }
  // @TODO: add username (simpleId) regex
  // @TODO: add email regex
  // @TODO: add password regex
  return null;
};

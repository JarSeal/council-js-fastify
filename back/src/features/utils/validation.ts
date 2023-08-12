import type { FastifyError } from 'fastify';

import type { Body } from '../publicSignUp/schemas';
import { errors } from '../../core/errors';
import type { DBUser } from '../../dbModels/user';
import { getConfig, type ConfigFile } from '../../core/config';

export type ValidationError = FastifyError | null;

export const validatePublicSignup = (
  body: Body,
  foundUser: DBUser | null,
  options?: Partial<ConfigFile['user']>
): ValidationError => {
  const username = body.username.trim();
  const pass = body.pass.trim();

  if (foundUser) {
    return new errors.USERNAME_TAKEN(username);
  }

  // Check lengths
  let conf = Number(getConfig('user.minUsernameLength') && 2);
  const minUserLength = options?.minUsernameLength || conf;
  if (username.length < minUserLength) {
    return new errors.CJS_ERR_VALIDATE(
      `Username is too short, minimum is ${minUserLength} characters.`
    );
  }
  conf = Number(getConfig('user.maxUsernameLength') && 32);
  const maxUserLength = options?.maxUsernameLength || conf;
  if (username.length > maxUserLength) {
    return new errors.CJS_ERR_VALIDATE(
      `Username is too long, maximum is ${maxUserLength} characters.`
    );
  }
  conf = Number(getConfig('user.minPassLength') && 8);
  const minPassLength = options?.minPassLength || conf;
  if (pass.length < minPassLength) {
    return new errors.CJS_ERR_VALIDATE(
      `Password is too short, minimum is ${minPassLength} characters.`
    );
  }
  conf = Number(getConfig('user.maxPassLength') && 128);
  const maxPassLength = options?.maxPassLength || conf;
  if (pass.length > maxPassLength) {
    return new errors.CJS_ERR_VALIDATE(
      `Password is too long, maximum is ${maxPassLength} characters.`
    );
  }
  // @TODO: add username (simpleId) regex
  // @TODO: add password regex
  return null;
};

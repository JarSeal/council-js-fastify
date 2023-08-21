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
  const minUserLength =
    options?.minUsernameLength || getConfig<number>('user.minUsernameLength', 2);
  if (username.length < minUserLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Username is too short, minimum is ${minUserLength} characters.`
    );
  }
  const maxUserLength =
    options?.maxUsernameLength || getConfig<number>('user.maxUsernameLength', 32);
  if (username.length > maxUserLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Username is too long, maximum is ${maxUserLength} characters.`
    );
  }
  const minPassLength = options?.minPassLength || getConfig<number>('user.minPassLength', 8);
  if (pass.length < minPassLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Password is too short, minimum is ${minPassLength} characters.`
    );
  }
  const maxPassLength = options?.maxPassLength || getConfig<number>('user.maxPassLength', 128);
  if (pass.length > maxPassLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Password is too long, maximum is ${maxPassLength} characters.`
    );
  }
  // @TODO: add username (simpleId) regex
  // @TODO: add password regex
  return null;
};

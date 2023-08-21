import { default as createFastifyError } from '@fastify/error';

export enum ErrorCodes {
  DB_CREATE_NEW_USER = 'DB_CREATE_NEW_USER',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  COUNCL_ERR_VALIDATE = 'COUNCL_ERR_VALIDATE',
  DB_CREATE_MONITOR = 'DB_CREATE_MONITOR',
  DB_UPDATE_MONITOR = 'DB_UPDATE_MONITOR',
}

const createError = (code: ErrorCodes, message: string, statusCode?: number) =>
  createFastifyError(code, message, statusCode);

const errors = {
  DB_CREATE_NEW_USER: createError(
    ErrorCodes.DB_CREATE_NEW_USER,
    'Could not create new user: %s',
    500
  ),
  USERNAME_TAKEN: createError(ErrorCodes.USERNAME_TAKEN, "Username '%s' is taken", 400),
  EMAIL_TAKEN: createError(ErrorCodes.EMAIL_TAKEN, "Email '%s' is taken", 400),
  COUNCL_ERR_VALIDATE: createError(
    ErrorCodes.COUNCL_ERR_VALIDATE,
    'New user validation failed: %s',
    400
  ),
  DB_CREATE_MONITOR: createError(
    ErrorCodes.DB_CREATE_MONITOR,
    'Could not create new monitor: %s',
    500
  ),
  DB_UPDATE_MONITOR: createError(ErrorCodes.DB_UPDATE_MONITOR, 'Could not update monitor: %s', 500),
};

export { errors };

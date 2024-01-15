import { default as createFastifyError } from '@fastify/error';

export enum ErrorCodes {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  LOGIN_USER_OR_PASS_WRONG = 'LOGIN_USER_OR_PASS_WRONG',
  LOGIN_USER_UNDER_COOLDOWN = 'LOGIN_USER_UNDER_COOLDOWN',
  USERNAME_TAKEN = 'USERNAME_TAKEN',
  EMAIL_TAKEN = 'EMAIL_TAKEN',
  COUNCL_ERR_VALIDATE = 'COUNCL_ERR_VALIDATE',
  GENERAL_ERROR = 'GENERAL_ERROR',
  DB_GENERAL_ERROR = 'DB_GENERAL_ERROR',
  DB_CREATE_NEW_USER = 'DB_CREATE_NEW_USER',
  DB_CREATE_MONITOR = 'DB_CREATE_MONITOR',
  DB_UPDATE_USER = 'DB_UPDATE_USER',
  DB_UPDATE_MONITOR = 'DB_UPDATE_MONITOR',
  FAST_JWT_ERR = 'FAST_JWT_ERROR',
  FAST_JWT_ERR_VALIDATE = 'FAST_JWT_VALIDATION_ERROR',
  SESSION_CANNOT_BE_SIGNED_IN = 'SESSION_CANNOT_BE_SIGNED_IN',
  SESSION_SET_TO_STORE_ERR = 'SESSION_SET_TO_STORE_ERR',
  SESSION_GET_FROM_STORE_ERR = 'SESSION_GET_FROM_STORE_ERR',
  SESSION_DEL_ERROR = 'SESSION_DEL_ERROR',
  FORM_DATA_BAD_REQUEST = 'FORM_DATA_BAD_REQUEST',
  AFTER_FN_ERR = 'AFTER_FN_ERR',
  REQUIRED_ACTIONS_ERR = 'REQUIRED_ACTIONS_ERR',
}

const createError = (code: ErrorCodes, message: string, statusCode?: number) =>
  createFastifyError(code, message, statusCode);

const errors = {
  UNAUTHORIZED: createError(ErrorCodes.UNAUTHORIZED, '%s', 401),
  FORBIDDEN: createError(ErrorCodes.FORBIDDEN, '%s', 403),
  NOT_FOUND: createError(ErrorCodes.NOT_FOUND, '%s', 404),
  LOGIN_USER_OR_PASS_WRONG: createError(
    ErrorCodes.LOGIN_USER_OR_PASS_WRONG,
    'Password or %s wrong',
    401
  ),
  LOGIN_USER_UNDER_COOLDOWN: createError(
    ErrorCodes.LOGIN_USER_UNDER_COOLDOWN,
    'User is under cooldown, login denied (%s)',
    401
  ),
  USERNAME_TAKEN: createError(ErrorCodes.USERNAME_TAKEN, "Username '%s' is taken", 400),
  EMAIL_TAKEN: createError(ErrorCodes.EMAIL_TAKEN, "Email '%s' is taken", 400),
  COUNCL_ERR_VALIDATE: createError(
    ErrorCodes.COUNCL_ERR_VALIDATE,
    'New user validation failed: %s',
    400
  ),
  GENERAL_ERROR: createError(ErrorCodes.GENERAL_ERROR, 'General server error, %s', 500),
  DB_GENERAL_ERROR: createError(ErrorCodes.DB_GENERAL_ERROR, 'General DB error, %s', 500),
  DB_CREATE_NEW_USER: createError(ErrorCodes.DB_CREATE_NEW_USER, 'Create new user error, %s', 500),
  DB_CREATE_MONITOR: createError(
    ErrorCodes.DB_CREATE_MONITOR,
    'Could not create new monitor: %s',
    500
  ),
  DB_UPDATE_USER: createError(ErrorCodes.DB_UPDATE_USER, 'Could not update user: %s', 500),
  DB_UPDATE_MONITOR: createError(ErrorCodes.DB_UPDATE_MONITOR, 'Could not update monitor: %s', 500),
  FAST_JWT_ERR: createError(ErrorCodes.FAST_JWT_ERR, '%s', 500),
  FAST_JWT_ERR_VALIDATE: createError(ErrorCodes.FAST_JWT_ERR_VALIDATE, '%s', 400),
  SESSION_CANNOT_BE_SIGNED_IN: createError(
    ErrorCodes.SESSION_CANNOT_BE_SIGNED_IN,
    'Cannot be signed in to access route',
    400
  ),
  SESSION_SET_TO_STORE_ERR: createError(
    ErrorCodes.SESSION_SET_TO_STORE_ERR,
    'Setting session to store failed: %s',
    500
  ),
  SESSION_GET_FROM_STORE_ERR: createError(
    ErrorCodes.SESSION_GET_FROM_STORE_ERR,
    'Setting session to store failed: %s',
    500
  ),
  SESSION_DEL_ERR: createError(ErrorCodes.SESSION_DEL_ERROR, '%s', 500),
  FORM_DATA_BAD_REQUEST: createError(ErrorCodes.FORM_DATA_BAD_REQUEST, '%s', 400),
  AFTER_FN_ERR: createError(ErrorCodes.AFTER_FN_ERR, '%s', 500),
  REQUIRED_ACTIONS_ERR: createError(
    ErrorCodes.REQUIRED_ACTIONS_ERR,
    'User has required actions that need to be fullfilled, %s',
    403
  ),
};

export { errors };

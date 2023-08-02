import type { PublicSignUpRoute } from '../publicSignUp/schemas';

export type ValidationError =
  | {
      error: string;
      msg: string;
      status: number;
    }
  | {
      error: null;
    };

export const validatePublicSignupBody = (body: PublicSignUpRoute['Body']): ValidationError => {
  if (!body) {
    return { error: 'BODY_NOT_OBJECT', status: 400, msg: 'The body is missing / not an object' };
  }
  if (!body.username) {
    return { error: 'USERNAME_NOT_VALID', status: 400, msg: "Username ('username') is required" };
  }
  // @TODO: add username regex and min/max length validation
  if (!body.email) {
    return { error: 'EMAIL_NOT_VALID', status: 400, msg: "Email ('email') is required" };
  }
  // @TODO: add email regex and min/max length validation
  if (!body.pass) {
    return {
      error: 'PASS_NOT_VALID',
      status: 400,
      msg: "Password ('pass') is not a valid password",
    };
  }
  // @TODO: add password regex and min/max length validation
  return { error: null };
};

export const dbCreateNewUserError = {
  error: 'DB_CREATE_NEW_USER_ERROR',
  status: 500,
  msg: 'Could not create new user',
};

import type { PublicSignUpRoute } from '../publicSignUp/schemas';

export type ValidationError =
  | {
      error: string;
      errorMsg: string;
      status: number;
    }
  | {
      error: null;
    };

export const validatePublicSignupBody = (body: PublicSignUpRoute['Body']): ValidationError => {
  if (!body) {
    return { error: 'BODY_NOT_OBJECT', status: 400, errorMsg: 'The body is not an object' };
  }
  if (!body.email) {
    return { error: 'EMAIL_NOT_VALID', status: 400, errorMsg: 'Email is not a valid email' };
  }
  if (!body.pass) {
    return { error: 'PASS_NOT_VALID', status: 400, errorMsg: 'Password is not a valid password' };
  }
  return { error: null };
};

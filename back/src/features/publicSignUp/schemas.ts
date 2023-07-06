import type { RouteGenericInterface } from 'fastify';

import type { ValidationError } from '../utils/validation';

export interface PublicSignUpRoute extends RouteGenericInterface {
  readonly Body: {
    email: string;
    pass: string;
  };
  readonly Reply: {
    ok: boolean;
    error?: ValidationError;
  };
}

export const bodySchema = {
  type: 'object',
  properties: {
    email: { type: 'string' },
    pass: { type: 'string' },
  },
  required: ['email', 'pass'],
};
export const responseSchema = { type: 'object', properties: { ok: { type: 'boolean' } } };

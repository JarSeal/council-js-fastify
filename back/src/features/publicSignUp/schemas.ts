import type { RouteGenericInterface } from 'fastify';

import type { ValidationError } from '../utils/validation';

export interface PublicSignUpRoute extends RouteGenericInterface {
  readonly Body: {
    username: string;
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
    username: { type: 'string' },
    email: { type: 'string' },
    pass: { type: 'string' },
  },
  required: ['username', 'email', 'pass'],
};
export const replySchema = {
  type: 'object',
  properties: { ok: { type: 'boolean' } },
  required: ['ok'],
};

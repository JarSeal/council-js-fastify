import { config } from 'dotenv';

config();

export type Environment = 'development' | 'production' | 'test';
export const ENVIRONMENT =
  ['development', 'production', 'test'].find((env) => env === process.env.ENVIRONMENT) ||
  'production';

export const HOST = process.env.HOST || '127.0.0.1';
export const PORT = parseInt(process.env.PORT || '4000');

// comma separated host names
export const CLIENT_HOST_NAMES = process.env.CLIENT_HOST_NAMES || '';

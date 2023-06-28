import { config } from 'dotenv';

config();

export type Environment = 'development' | 'production' | 'test';
export const ENVIRONMENT =
  ['development', 'production', 'test'].find((env) => env === process.env.NODE_ENV) || 'production';

export const HOST = process.env.HOST || '127.0.0.1';
export const PORT = parseInt(process.env.PORT || '4000');

// comma separated host names
export const CLIENT_HOST_NAMES = process.env.CLIENT_HOST_NAMES || '';

export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || '';

import { config } from 'dotenv';
import { Type } from '@sinclair/typebox';
import type { Static } from '@sinclair/typebox';

import * as CONFIG from '../../../CONFIG.json';

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

const configFileSchema = Type.Object({
  user: Type.Object({
    minUsernameLength: Type.Number(),
    maxUsernameLength: Type.Number(),
    minPassLength: Type.Number(),
    maxPassLength: Type.Number(),
  }),
});
export type ConfigFile = Static<typeof configFileSchema>;

export const getConfig = (path?: string) => {
  const conf = CONFIG ? (CONFIG as object) : {};
  const returnWrapper = (returnConf: unknown) => {
    if (returnConf === undefined) {
      // eslint-disable-next-line no-console
      console.warn(`Could not find getConfig path: ${path ? `'${path}'` : 'undefined'}`);
    }
    return returnConf;
  };

  if (path) {
    const splitPath = path.split('.');
    if (splitPath.length === 1) {
      return returnWrapper(conf[path as keyof typeof conf]);
    }
    let returnConf = conf[splitPath[0] as keyof typeof conf];
    if (returnConf === undefined) {
      return returnWrapper(returnConf);
    }
    for (let i = 1; i < splitPath.length; i++) {
      const nextNode = splitPath[i] as keyof typeof returnConf;
      returnConf = returnConf[nextNode];
      if (returnConf === undefined) {
        return returnWrapper(returnConf);
      }
    }
    return returnWrapper(returnConf);
  }

  if (!CONFIG) {
    // eslint-disable-next-line no-console
    console.error(
      'Could not find CONFIG.json at the root of the project or CONFIG.json is empty or invalid'
    );
  }
  return conf;
};

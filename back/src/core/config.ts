import { config } from 'dotenv';
import crypto from 'crypto';

import * as CONFIG from '../../../CONFIG.json';
import DBSystemSettingModel, { type DBSystemSetting } from '../dbModels/systemSetting.js';
import DBFormModel, { type DBForm } from '../dbModels/form.js';

config();

export type Environment = 'development' | 'production' | 'test';
export const ENVIRONMENT =
  ['development', 'production', 'test'].find((env) => env === process.env.NODE_ENV) || 'production';
export const IS_PRODUCTION = ENVIRONMENT === 'production';
export const IS_TEST = ENVIRONMENT === 'test';
export const IS_DEVELOPMENT = ENVIRONMENT === 'development';

export const HOST = process.env.HOST || 'http://127.0.0.1';
export const PORT = parseInt(process.env.PORT || '4000');
export const BACK_BASE_URL = process.env.BACK_BASE_URL || `${HOST}${PORT ? ':' : ''}${PORT}`;

// comma separated host names
export const CLIENT_HOST_NAMES = process.env.CLIENT_HOST_NAMES || '';

export const MONGODB_URI = process.env.MONGODB_URI || '';
export const MONGODB_URI_TEST = process.env.MONGODB_URI_TEST || '';

// @TODO: move these constants to the shared package when it is implemented
export const CSRF_HEADER_NAME = 'x-council-csrf';
export const CSRF_HEADER_VALUE = '1';
export const CLIENT_ROOT_ELEM_ID = process.env.CLIENT_ROOT_ELEM_ID || 'root';

export const HASH_SALT_ROUNDS = process.env.HASH_SALT_ROUNDS || 10;
export const URL_TOKEN_SECRET =
  ENVIRONMENT === 'test' ? 'testsecret' : process.env.URL_TOKEN_SECRET || '123';
export const SESSION_SECRET =
  process.env.SESSION_SECRET || 'a secret with minimum length of 32 characters';
export const SESSION_COOKIE_NAME = IS_PRODUCTION ? `__Host-${'counclSess'}` : 'counclSess';

export const TWOFA_RESEND_INTERVAL_IN_MINUTES = 2;
export const MAX_FORGOT_PASSWORD_RESENDS = 4;

export const getConfig = <T>(path?: string, defaultValue?: unknown): T => {
  const conf = CONFIG || {};
  const returnWrapper = (returnConf: unknown) => {
    if (returnConf === undefined && defaultValue === undefined) {
      // eslint-disable-next-line no-console
      console.warn(
        `Could not find getConfig path and defaultValue was undefined: ${
          path ? `'${path}'` : 'undefined'
        }`
      );
    } else if (returnConf === undefined) {
      return defaultValue as T;
    }
    return returnConf as T;
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
  return conf as T;
};

let cachedSysSettings: DBSystemSetting[] | null = null;
let cachedSysSettingsForm: DBForm | null = null;

export const setCachedSysSettings = async () => {
  cachedSysSettings = await DBSystemSettingModel.find<DBSystemSetting>({});
  cachedSysSettingsForm = await DBFormModel.findOne<DBForm>({ simpleId: 'systemSettings' });
};

const getCachedSysSettings = async () => {
  if (!cachedSysSettings) {
    await setCachedSysSettings();
  }
  return cachedSysSettings;
};

export const getSysSetting = async <T>(id: string): Promise<T | undefined> => {
  const settings = await getCachedSysSettings();
  if (!settings) return undefined;

  const setting = settings.find((item) => item.simpleId === id);
  if (!setting) {
    const formElem = Array.isArray(cachedSysSettingsForm?.form.formElems)
      ? cachedSysSettingsForm?.form.formElems.find((elem) => elem.elemId === id)
      : undefined;
    return formElem?.elemData?.defaultValue as T;
  }

  return setting.value as T;
};

export const getSysSettingsForm = async () => {
  if (!cachedSysSettingsForm) {
    await setCachedSysSettings();
  }
  return cachedSysSettingsForm;
};

export type PublicSysSettings = { [key: string]: unknown };

export const getPublicSysSettings = async (): Promise<PublicSysSettings> => {
  const settings = await getCachedSysSettings();
  const sysForm = await getSysSettingsForm();
  if (!settings || !sysForm) return {};

  const publicSettings: PublicSysSettings = {};
  for (let i = 0; i < sysForm.form.formElems.length; i++) {
    const elem = sysForm.form.formElems[i];
    if (elem.elemData?.publicSetting) {
      const setting = settings.find((item) => item.simpleId === elem.elemId);
      if (setting) {
        publicSettings[elem.elemId] = setting.value;
      } else if (elem.elemData.defaultValue !== undefined) {
        publicSettings[elem.elemId] = elem.elemData.defaultValue;
      }
    }
  }

  return publicSettings;
};

// DB value/secret encryption
let dbPassSecretKey: string;
let dbPassSecretIv: string;
const generateDBHashes = () => {
  if (dbPassSecretKey && dbPassSecretIv) return;
  dbPassSecretKey = crypto
    .createHash('sha512')
    .update(process.env.DB_SECRETS_KEY || 'dummyKeySecret')
    .digest('hex')
    .substring(0, 32);
  dbPassSecretIv = crypto
    .createHash('sha512')
    .update(process.env.DB_SECRETS_IV || 'dummyIvSecret')
    .digest('hex')
    .substring(0, 16);
};
export const encryptData = (data: string) => {
  generateDBHashes();
  const cipher = crypto.createCipheriv('aes-256-cbc', dbPassSecretKey, dbPassSecretIv);
  // Encrypts data and converts to hex and base64
  return Buffer.from(cipher.update(data, 'utf8', 'hex') + cipher.final('hex')).toString('base64');
};
export function decryptData(encryptedData: string) {
  generateDBHashes();
  const buff = Buffer.from(encryptedData, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-cbc', dbPassSecretKey, dbPassSecretIv);
  // Decrypts data and converts to utf8
  return decipher.update(buff.toString('utf8'), 'hex', 'utf8') + decipher.final('utf8');
}

export const getAppName = async () => (await getSysSetting<string>('appName')) || 'Council';

import type { FastifyRequest } from 'fastify';

import type { TransText } from '../dbModels/_modelTypePartials.js';
import { getUserData } from './userAndPrivilegeChecks.js';
import { getConfig, getSysSetting } from '../core/config.js';
// import type * as CONFIG from '../../../CONFIG.json';
// import type { CONFIG } from '@council/shared';

// @TODO: move the Lang type to shared
const SYS_DEFAULT_LANG_CODE = 'en';
const SYS_DEFAULT_LANG_SHORT_NAME = 'Eng';
const SYS_DEFAULT_LANG_NAME = 'English';
const defaultLanguageItem = {
  [SYS_DEFAULT_LANG_CODE]: { shortName: SYS_DEFAULT_LANG_SHORT_NAME, name: SYS_DEFAULT_LANG_NAME },
};
export type LanguagesList = { [key: string]: { shortName: string; name: string } };
export const allLanguages = getConfig<LanguagesList>('appGeneral.languages', defaultLanguageItem);
export type Lang = string;

// Translate a langObject
export const TR = async (langObject?: TransText, opts?: { lang?: Lang; req?: FastifyRequest }) => {
  if (!langObject) return `[missing langObject]`;
  const isString = typeof langObject === 'string';
  if (isString) return langObject; // @TODO: actually get the translation object from the translation files (placed in shared folder)
  if (!isString && langObject.langKey) return langObject.langKey; // @TODO: actually get the translation object from the translation files (placed in shared folder)
  const curLang: Lang = opts?.lang || (await getLanguage(opts?.req));
  if (!isString && langObject.langs && curLang) {
    return langObject.langs[curLang] || `[missing langs key (${curLang})]`;
  }
  return `[missing langKey/langs props]`;
};

export const getLanguageKey = (langObject?: TransText) => {
  if (!langObject) return null;
  if (typeof langObject === 'string') return langObject;
  if (langObject.langKey) return langObject.langKey;
  return null;
};

export const getLanguage = async (req?: FastifyRequest) => {
  if (!req) {
    const defaultLang =
      ((await getSysSetting<string>('defaultLang')) as Lang | undefined) || SYS_DEFAULT_LANG_CODE;
    return defaultLang;
  }

  const userData = await getUserData(req);

  return userData.lang || SYS_DEFAULT_LANG_CODE;
};

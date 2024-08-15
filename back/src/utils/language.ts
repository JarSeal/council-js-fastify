import type { FastifyRequest } from 'fastify';

import type { TransText } from '../dbModels/_modelTypePartials';
import { getUserData } from './userAndPrivilegeChecks';
import { getConfig, getSysSetting } from '../core/config';
import type * as CONFIG from '../../../CONFIG.json';

// @TODO: move the Lang type to shared
const SYS_DEFAULT_LANG_CODE = 'en';
const SYS_DEFAULT_LANG_SHORT_NAME = 'Eng';
const SYS_DEFAULT_LANG_NAME = 'English';
const defaultLanguageItem = {
  [SYS_DEFAULT_LANG_CODE]: { shortName: SYS_DEFAULT_LANG_SHORT_NAME, name: SYS_DEFAULT_LANG_NAME },
};
export type LanguagesList = (typeof CONFIG)['appGeneral']['languages'] | typeof defaultLanguageItem;
export const allLanguages = getConfig<LanguagesList>('appGeneral.languages', defaultLanguageItem);
export type Lang = keyof (typeof CONFIG)['appGeneral']['languages'];

// Translate a langObject
export const TR = async (langObject?: TransText, opts?: { lang?: Lang; req?: FastifyRequest }) => {
  const curLang: Lang = opts?.lang || (await getLanguage(opts?.req));
  if (!langObject) return `[missing langObject]`;
  if (langObject.langKey) return langObject.langKey; // @TODO: actually get the translation object from the translation files (placed in shared folder)
  if (langObject.langs && curLang) {
    return langObject.langs[curLang] || `[missing langs key (${curLang})]`;
  }
  return `[missing langKey/langs props]`;
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

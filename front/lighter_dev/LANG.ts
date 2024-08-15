import { globalSettings } from './CMP';

export type LanguageItem = { code: string; shortName?: string; name?: string };
export type AllLanguages = LanguageItem[];
export type LanguageData = {
  [language: string]:
    | { [key: string]: string | { [langKey: string]: string } }
    | { __language: LanguageItem };
};

let curLang: string | null = null;
let defaultLang: string | null = null;
let fallbackToDefault: boolean = false;
let languages: AllLanguages = [];
const languageData: LanguageData = {};

export const setLanguageData = (langData: LanguageData) => {
  const allBaseKeys = Object.keys(langData);
  if (!defaultLang) defaultLang = allBaseKeys[0] || null;
  for (let i = 0; i < allBaseKeys.length; i++) {
    const langKey = allBaseKeys[i];
    languageData[langKey] = langData[langKey];

    // Set possible language data (key: '__language') from the json to the all languages list
    const languageListItem = languages.find((item) => item.code === langKey);
    const languageInfo = langData[langKey]['__language'] as Omit<LanguageItem, 'code'>;
    if (!languageListItem && typeof languageInfo !== 'string') {
      languages.push({ code: langKey, ...languageInfo });
    } else if (typeof languageInfo !== 'string') {
      languages = languages.map((l) => {
        if (l.code === langKey) return { ...l, ...languageInfo };
        return l;
      });
    }
  }
};
export const getLanguageDataKeys = () => Object.keys(languageData);
export const clearLanguageData = (langKey?: string, keepLanguagesList?: boolean) => {
  // Clear one language
  if (langKey) {
    delete languageData[langKey];
    if (keepLanguagesList !== true) {
      languages = languages.filter((l) => l.code !== langKey);
      if (!languages.length) {
        setLanguage(null);
        setDefaultLanguage(null);
        return;
      }
      if (getDefaultLanguage() === langKey) setDefaultLanguage(languages[0].code);
      if (getLanguage() === langKey) setLanguage(getDefaultLanguage());
    }
    return;
  }

  // Clear all languages
  const keys = Object.keys(languageData);
  for (let i = 0; i < keys.length; i++) {
    delete languageData[keys[i]];
    if (keepLanguagesList !== true) languages = languages.filter((l) => l.code !== keys[i]);
  }
  if (keepLanguagesList !== true) {
    setLanguage(null);
    setDefaultLanguage(null);
  }
};

export const getLanguage = () => curLang || getDefaultLanguage();
export const setLanguage = (lang: string | null) => {
  // Set curLang
  curLang = lang;

  // Set defaultLanguage if missing
  if (!getDefaultLanguage()) setDefaultLanguage(lang);

  // Set languages list item if missing
  if (lang) {
    const languageListItem = languages.find((item) => item.code === lang);
    if (!languageListItem) languages.push({ code: lang });
  }
};
export const getDefaultLanguage = () => defaultLang;
export const setDefaultLanguage = (lang?: string | null, fallbackToDefaultLang?: boolean) => {
  const firstLanguageListItem = languages.length ? languages[0].code : null;
  if (firstLanguageListItem) defaultLang = firstLanguageListItem;
  defaultLang = lang !== undefined ? lang : defaultLang;
  if (fallbackToDefaultLang !== undefined) {
    fallbackToDefault = Boolean(fallbackToDefaultLang);
  }
  if (lang && !getLanguage()) setLanguage(lang);
};
export const getLanguages = () => languages;
export const setLanguages = (langs: AllLanguages) => (languages = langs);

// Old TransText type
// export type TransText =
//   | {
//       langs: { [lang: string]: string };
//       langKey?: string;
//       params?: { [key: string]: string };
//     }
//   | {
//       langs?: { [lang: string]: string };
//       langKey: string;
//       params?: { [key: string]: string };
//     };

export type TransText = string | { [lang: string]: string };
export type TR_langKey = TransText | null | undefined;
export type TR_opts = {
  language?: string | null;
  params?: { [key: string]: string };
  group?: string;
  sanitize?: boolean;
};

export const TEXT_MISSING_STRING = '[!text]';

// (TR)anslate the text
export const TR = (languageKey: TR_langKey, opts?: TR_opts) => {
  if (languageKey === undefined || languageKey === null) return '';

  const lang = opts?.language || opts?.language === null ? opts.language : getLanguage();
  const defaultLanguage = getDefaultLanguage();
  const langTextKey = getLangTextKey(languageKey);

  if (isObject(languageKey)) {
    return _interpolateLangParams(langTextKey, opts?.params, opts?.sanitize);
  }

  if (!lang || (!languageData[lang] && defaultLanguage && !languageData[defaultLanguage])) {
    return _interpolateLangParams(langTextKey, opts?.params, opts?.sanitize);
  }

  let rawTranslation = null;
  const getRawTranslation = (
    data: Exclude<LanguageData[keyof LanguageData], { __language: LanguageItem }>
  ) => {
    if (opts?.group && data[opts.group] && typeof data[opts.group] !== 'string') {
      const groupData = data[opts.group] as { [langKey: string]: string } | undefined;
      const result = groupData && groupData[langTextKey];
      return result || null;
    } else if (!opts?.group && typeof data[langTextKey] === 'string') {
      return data[langTextKey] || null;
    }
  };

  rawTranslation = getRawTranslation(languageData[lang]);

  // If rawTranslation not found, check possible default language as fallback (if enabled)
  if (
    !rawTranslation &&
    fallbackToDefault &&
    lang !== defaultLanguage &&
    defaultLanguage &&
    languageData[defaultLanguage]
  ) {
    rawTranslation = getRawTranslation(languageData[defaultLanguage]);
  }

  // If still no rawTranslation is found, return the langTextKey
  if (!rawTranslation) rawTranslation = langTextKey;
  return _interpolateLangParams(rawTranslation, opts?.params, opts?.sanitize);
};

export const getLangTextKey = (transText?: TransText | null, language?: string) => {
  if (typeof transText === 'string') return transText;
  if (!transText) return TEXT_MISSING_STRING;
  const lang = language || language === null ? language : getLanguage();
  if (!lang) {
    throw new Error(
      'Language was not set, langKey as an object has to have a language set with setLanguage() or setDefaultLanguage().'
    );
  }
  if (!isObject(transText)) {
    // eslint-disable-next-line no-console
    console?.warn(
      `Property transText must be either an object, a string, null, or undefined. Type is '${typeof transText}'.`
    );
    return TEXT_MISSING_STRING;
  }
  let langTextKey = transText[lang] || null;
  if (!langTextKey && fallbackToDefault) {
    const defaultLanguage = getDefaultLanguage();
    langTextKey = defaultLanguage && transText[defaultLanguage];
  }
  if (!langTextKey) return TEXT_MISSING_STRING;
  return langTextKey;
};

export const _interpolateLangParams = (
  langStr: string,
  params?: { [key: string]: string | undefined },
  sanitize?: boolean
) => {
  if (!params) return langStr;
  const keys = Object.keys(params);
  let str = langStr;
  for (let i = 0; i < keys.length; i++) {
    const value =
      globalSettings?.sanitizer && sanitize !== false
        ? globalSettings?.sanitizer(params[keys[i]] || '')
        : params[keys[i]];
    str = str.replaceAll(`{{${keys[i]}}}`, value || '');
  }
  return str;
};

// @TODO: move this to shared helpers/utils
const isObject = (x: unknown) => typeof x === 'object' && !Array.isArray(x) && x !== null;

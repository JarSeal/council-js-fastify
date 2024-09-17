import { expect, test } from 'vitest';
import {
  _interpolateLangParams,
  clearLanguageData,
  getDefaultLanguage,
  getLangTextKey,
  getLanguage,
  getLanguageDataKeys,
  getLanguages,
  getTRFunction,
  setDefaultLanguage,
  setLanguage,
  setLanguageData,
  setLanguages,
  TEXT_MISSING_STRING,
  TR,
  useDefaultLangAsFallback,
  type TransText,
} from './LNG';
import { setSanitizer } from './CMP';
import englishData from './test/lang.en.json';
import finnishData from './test/lang.fi.json';

test('_interpolateLangParams', () => {
  setSanitizer(encodeURI);
  const testData = [
    {
      str: 'Just a string',
      expect: 'Just a string',
    },
    {
      str: 'Just a string',
      params: {},
      expect: 'Just a string',
    },
    {
      str: 'Just a string',
      params: { myParam: 'param' },
      expect: 'Just a string',
    },
    {
      str: 'Just a {{myParam}}',
      params: { myParam: 'param' },
      expect: 'Just a param',
    },
    {
      str: 'This string has multiple {{myParam1}} and another {{myParam2}}. Also a second case of the same {{myParam2}}.',
      params: { myParam1: 'params', myParam2: 'param' },
      expect:
        'This string has multiple params and another param. Also a second case of the same param.',
    },
    {
      str: 'This string has multiple {{myParam1}} and another escaped {{myParam2}}. Also a second case of the same escaped {{myParam2}}. And one more escaped param, {{myParam3}}.',
      params: { myParam1: 'params', myParam2: '<script>alert("xss")</script>', myParam3: 'äöåÄÖÅ' },
      expect:
        'This string has multiple params and another escaped %3Cscript%3Ealert(%22xss%22)%3C/script%3E. Also a second case of the same escaped %3Cscript%3Ealert(%22xss%22)%3C/script%3E. And one more escaped param, %C3%A4%C3%B6%C3%A5%C3%84%C3%96%C3%85.',
    },
    {
      str: 'Unsanitized {{myParam}}',
      params: { myParam: '<div>Div content</div>' },
      expect: 'Unsanitized <div>Div content</div>',
      sanitizeParams: false,
    },
  ];
  testData.forEach((data) => {
    const interpolated = _interpolateLangParams(data.str, data.params, data.sanitizeParams);
    expect(interpolated).toBe(data.expect);
  });
  setSanitizer(null);
});

test('getLangTextKey', () => {
  let transTextKey: TransText | null | undefined = 'Some text';
  let result = getLangTextKey(transTextKey);
  expect(result).toBe(transTextKey);

  transTextKey = undefined;
  result = getLangTextKey(transTextKey);
  expect(result).toBe(TEXT_MISSING_STRING);

  transTextKey = null;
  result = getLangTextKey(transTextKey);
  expect(result).toBe(TEXT_MISSING_STRING);

  try {
    transTextKey = { en: 'Some string' };
    getLangTextKey(transTextKey);
  } catch (err) {
    expect(String(err)).toBe(
      'Error: Language was not set, langKey as an object has to have a language set with setLanguage() or setDefaultLanguage().'
    );
  }

  setLanguage('en');
  transTextKey = { en: 'Some string', fi: 'Joku teksti' };
  result = getLangTextKey(transTextKey);
  expect(result).toBe('Some string');

  setLanguage('fi');
  transTextKey = { en: 'Some string', fi: 'Joku teksti' };
  result = getLangTextKey(transTextKey);
  expect(result).toBe('Joku teksti');

  setLanguage('en');
  transTextKey = { en: 'Some string', fi: 'Joku teksti' };
  result = getLangTextKey(transTextKey, 'fi');
  expect(result).toBe('Joku teksti');

  transTextKey = { en: 'Some string', fi: 'Joku teksti' };
  result = getLangTextKey(transTextKey, 'sv');
  expect(result).toBe(TEXT_MISSING_STRING);

  useDefaultLangAsFallback(true);
  transTextKey = { en: 'Some string', fi: 'Joku teksti' };
  result = getLangTextKey(transTextKey, 'sv');
  expect(result).toBe('Some string');

  setLanguage(null);
  setDefaultLanguage(null);
  useDefaultLangAsFallback(false);
});

test('setters and getters', () => {
  setLanguage(null);
  setDefaultLanguage(null);

  let lang = getLanguage();
  expect(lang).toBe(null);
  let defaultLang = getDefaultLanguage();
  expect(defaultLang).toBe(null);

  setLanguage('en');
  lang = getLanguage();
  expect(lang).toBe('en');
  defaultLang = getDefaultLanguage();
  expect(defaultLang).toBe('en');

  setLanguage('fi');
  lang = getLanguage();
  expect(lang).toBe('fi');

  setDefaultLanguage('fi');
  defaultLang = getDefaultLanguage();
  expect(defaultLang).toBe('fi');

  const langs = [
    { code: 'en', shortName: 'Eng', name: 'English' },
    { code: 'fi', shortName: 'Fin', name: 'Finnish' },
  ];
  setLanguages(langs);
  const result = getLanguages();
  expect(result).toStrictEqual(langs);

  setLanguage(null);
  setDefaultLanguage(null);
});

test('setLanguageData, clearLanguageData, getLanguages', () => {
  clearLanguageData();
  setLanguageData({ en: englishData, fi: finnishData });

  let result = getLanguageDataKeys();
  expect(result).toStrictEqual(['en', 'fi']);
  let languages = getLanguages();
  expect(languages).toStrictEqual([
    { code: 'en', shortName: 'Eng', name: 'English' },
    { code: 'fi', shortName: 'Fin', name: 'Finnish' },
  ]);
  expect(getLanguage()).toBe('en');
  expect(getDefaultLanguage()).toBe('en');

  clearLanguageData('fi');
  result = getLanguageDataKeys();
  expect(result).toStrictEqual(['en']);
  languages = getLanguages();
  expect(languages).toStrictEqual([{ code: 'en', shortName: 'Eng', name: 'English' }]);
  expect(getLanguage()).toBe('en');
  expect(getDefaultLanguage()).toBe('en');

  setLanguageData({ fi: finnishData });
  result = getLanguageDataKeys();
  expect(result).toStrictEqual(['en', 'fi']);
  languages = getLanguages();
  expect(languages).toStrictEqual([
    { code: 'en', shortName: 'Eng', name: 'English' },
    { code: 'fi', shortName: 'Fin', name: 'Finnish' },
  ]);
  expect(getLanguage()).toBe('en');
  expect(getDefaultLanguage()).toBe('en');

  clearLanguageData('en');
  result = getLanguageDataKeys();
  expect(result).toStrictEqual(['fi']);
  languages = getLanguages();
  expect(languages).toStrictEqual([{ code: 'fi', shortName: 'Fin', name: 'Finnish' }]);
  expect(getLanguage()).toBe('fi');
  expect(getDefaultLanguage()).toBe('fi');

  clearLanguageData();
});

test('TR function', () => {
  clearLanguageData();
  setLanguageData({ en: englishData, fi: finnishData });

  // setLanguage and TR
  setLanguage('en');
  let translation = TR('One');
  expect(translation).toBe('One');
  setLanguage('fi');
  translation = TR('One');
  expect(translation).toBe('Yksi');

  // opts.params
  setLanguage('en');
  translation = TR('Interpolated example {{myParam}}');
  expect(translation).toBe('Interpolated example {{myParam}}');
  translation = TR('Interpolated example {{myParam}}', { params: { myParam: 'test' } });
  expect(translation).toBe('Interpolated example test');

  // opts.language
  setLanguage('en');
  translation = TR('Three', { language: 'fi' });
  expect(translation).toBe('Kolme');
  setLanguage('fi');
  translation = TR('Three');
  expect(translation).toBe('Kolme');
  translation = TR('Three', { language: 'en' });
  expect(translation).toBe('Three');
  useDefaultLangAsFallback(true);
  translation = TR('someKey');
  expect(translation).toBe(
    'Just some text with a simple key that is missing from other translations'
  );
  useDefaultLangAsFallback(false);
  translation = TR('someKey');
  expect(translation).toBe('someKey');

  // opts.group (getTRFunction)
  setLanguage('fi');
  translation = TR(
    'Interpolated with multiple values: {{myParam1}} {{myParam2}} and {{myParam1}}',
    { group: 'Group1', params: { myParam1: '34', myParam2: '200,000' } }
  );
  expect(translation).toBe('Interpoloitu useammalla arvolla: 34 200,000 ja 34');
  const groupTR = getTRFunction({ group: 'Group1' });
  translation = groupTR('Cat');
  expect(translation).toBe('Kissa');
  translation = groupTR('Cat', { language: 'en' });
  expect(translation).toBe('Cat');

  // opts.sanitize and opts.sanitizeParams
  setSanitizer(encodeURI);
  setLanguage('en');
  translation = TR('Some escapable <content /> and {{myParam}}', {
    params: { myParam: '<morecontent />' },
    sanitizeParams: false,
  });
  expect(translation).toBe('Some escapable <content /> and <morecontent />');
  translation = TR('Some escapable <content /> and {{myParam}}', {
    params: { myParam: '<morecontent />' },
    sanitizeParams: true, // This is default
  });
  expect(translation).toBe('Some escapable <content /> and %3Cmorecontent%20/%3E');
  translation = TR('Some escapable <content /> and {{myParam}}', {
    params: { myParam: '<morecontent />' },
    sanitize: true,
  });
  expect(translation).toBe(
    'Some%20escapable%20%3Ccontent%20/%3E%20and%20%253Cmorecontent%2520/%253E'
  );
});

import mongoose from 'mongoose';
import { describe, it, expect } from 'vitest';

import initApp from '../core/app';
import { type FormElem } from '../dbModels/_modelTypePartials';
import {
  isValueAndTypeValid,
  validateEmail,
  validateFormDataInput,
  validateLoginMethod,
  validatePhoneWithExtraChars,
  validateSimpleId,
} from './validation';
import DBSystemSettingModel from '../dbModels/systemSetting';
import { setCachedSysSettings } from '../core/config';

describe('validation util', () => {
  it('should validate a simpleId', () => {
    const result1 = validateSimpleId('');
    const result2 = validateSimpleId(null);
    const result3 = validateSimpleId('a');
    const result4 = validateSimpleId('simpleId-that--has_all__43023');
    const result5 = validateSimpleId('Wrong$');
    const result6 = validateSimpleId('Wrong@');

    expect(result1).toBeTruthy();
    expect(result2).toBeFalsy();
    expect(result3).toBeTruthy();
    expect(result4).toBeTruthy();
    expect(result5).toBeFalsy();
    expect(result6).toBeFalsy();
  });

  it('should validate an email', () => {
    const result1 = validateEmail('');
    const result2 = validateEmail(null);
    const result3 = validateEmail('a');
    const result4 = validateEmail('first.last@council');
    const result5 = validateEmail('a@a.a');
    const result6 = validateEmail('@x.x');
    const result7 = validateEmail('x@x.');

    expect(result1).toBeTruthy();
    expect(result2).toBeFalsy();
    expect(result3).toBeFalsy();
    expect(result4).toBeTruthy();
    expect(result5).toBeTruthy();
    expect(result6).toBeFalsy();
    expect(result7).toBeFalsy();
  });

  it('should validate a phone number with extra characters', () => {
    const result1 = validatePhoneWithExtraChars('');
    const result2 = validatePhoneWithExtraChars(null);
    const result3 = validatePhoneWithExtraChars('aaa');
    const result4 = validatePhoneWithExtraChars('1234567890');
    const result5 = validatePhoneWithExtraChars('+631234567890');
    const result6 = validatePhoneWithExtraChars('1234u53246');
    const result7 = validatePhoneWithExtraChars('1235$74387');
    const result8 = validatePhoneWithExtraChars('+31-(40)-123 3455');
    const result9 = validatePhoneWithExtraChars('+31 40 123 3455');

    expect(result1).toBeTruthy();
    expect(result2).toBeFalsy();
    expect(result3).toBeFalsy();
    expect(result4).toBeTruthy();
    expect(result5).toBeTruthy();
    expect(result6).toBeFalsy();
    expect(result7).toBeFalsy();
    expect(result8).toBeTruthy();
    expect(result9).toBeTruthy();
  });

  it('should validate a valueType', () => {
    const string1 = isValueAndTypeValid('string', null);
    const string2 = isValueAndTypeValid('string', undefined);
    const string3 = isValueAndTypeValid('string', '');
    const string4 = isValueAndTypeValid('string', 'My string');
    const string5 = isValueAndTypeValid('string', {});
    const string6 = isValueAndTypeValid('string', []);
    const string7 = isValueAndTypeValid('string', 1);

    expect(string1).toBeFalsy();
    expect(string2).toBeFalsy();
    expect(string3).toBeTruthy();
    expect(string4).toBeTruthy();
    expect(string5).toBeFalsy();
    expect(string6).toBeFalsy();
    expect(string7).toBeFalsy();

    const number1 = isValueAndTypeValid('number', null);
    const number2 = isValueAndTypeValid('number', undefined);
    const number3 = isValueAndTypeValid('number', 0);
    const number4 = isValueAndTypeValid('number', 1235325);
    const number5 = isValueAndTypeValid('number', -434);
    const number6 = isValueAndTypeValid('number', 1.435);
    const number7 = isValueAndTypeValid('number', 12e3);
    const number8 = isValueAndTypeValid('number', {});
    const number9 = isValueAndTypeValid('number', []);
    const number10 = isValueAndTypeValid('number', '123');

    expect(number1).toBeFalsy();
    expect(number2).toBeFalsy();
    expect(number3).toBeTruthy();
    expect(number4).toBeTruthy();
    expect(number5).toBeTruthy();
    expect(number6).toBeTruthy();
    expect(number7).toBeTruthy();
    expect(number8).toBeFalsy();
    expect(number9).toBeFalsy();
    expect(number10).toBeFalsy();

    const date1 = isValueAndTypeValid('date', null);
    const date2 = isValueAndTypeValid('date', undefined);
    const date3 = isValueAndTypeValid('date', new Date().toISOString());
    const date4 = isValueAndTypeValid('date', '2023-11-26T21:03:13.370Z');
    const date5 = isValueAndTypeValid('date', new Date('2023-11-26').toISOString());
    const date6 = isValueAndTypeValid('date', 12);
    const date7 = isValueAndTypeValid('date', '2021');
    const date8 = isValueAndTypeValid('date', []);
    const date9 = isValueAndTypeValid('date', {});

    expect(date1).toBeFalsy();
    expect(date2).toBeFalsy();
    expect(date3).toBeTruthy();
    expect(date4).toBeTruthy();
    expect(date5).toBeTruthy();
    expect(date6).toBeFalsy();
    expect(date7).toBeFalsy();
    expect(date8).toBeFalsy();
    expect(date9).toBeFalsy();

    const unknown1 = isValueAndTypeValid('unknown', null);
    const unknown2 = isValueAndTypeValid('unknown', undefined);
    const unknown3 = isValueAndTypeValid('unknown', 1);
    const unknown4 = isValueAndTypeValid('unknown', 'fafa');

    expect(unknown1).toBeTruthy();
    expect(unknown2).toBeTruthy();
    expect(unknown3).toBeTruthy();
    expect(unknown4).toBeTruthy();

    const none1 = isValueAndTypeValid('none', null);
    const none2 = isValueAndTypeValid('none', undefined);
    const none3 = isValueAndTypeValid('none', 1);
    const none4 = isValueAndTypeValid('none', 'fafa');

    expect(none1).toBeTruthy();
    expect(none2).toBeTruthy();
    expect(none3).toBeTruthy();
    expect(none4).toBeTruthy();

    const false1 = isValueAndTypeValid('nonExistingType', null);
    const false2 = isValueAndTypeValid('nonExistingType', undefined);
    const false3 = isValueAndTypeValid('nonExistingType', 1);
    const false4 = isValueAndTypeValid('nonExistingType', 'fafa');

    expect(false1).toBeFalsy();
    expect(false2).toBeFalsy();
    expect(false3).toBeFalsy();
    expect(false4).toBeFalsy();
  });

  it('should validate formData input', () => {
    const formElems1 = [
      {
        elemId: 'myElem1',
        orderNr: 0,
        elemType: 'inputText',
        valueType: 'string',
        elemData: { minLength: 3, maxLength: 10 },
        required: true,
        validationRegExp: { pattern: '[0-9]+$', flags: 'i' },
        mustMatchValue: undefined,
        validationFn: undefined,
        inputErrors: [
          {
            errorId: 'minLength',
            message: { langKey: 'Too short' },
          },
        ],
        doNotSave: false,
      },
      {
        elemId: 'myElem2',
        orderNr: 1,
        elemType: 'inputText',
        valueType: 'string',
        elemData: { minLength: 3, maxLength: 10 },
        required: true,
        validationRegExp: { pattern: '[0-9]+$', flags: '' },
        mustMatchValue: undefined,
        validationFn: undefined,
        inputErrors: [
          {
            errorId: 'minLength',
            message: { langKey: 'Too short' },
          },
        ],
        doNotSave: true,
      },
    ] as FormElem[];
    const formData1 = [
      {
        elemId: 'myElem1',
        value: '1',
      },
      {
        elemId: 'myElem2',
        value: '1',
      },
    ];
    let result = validateFormDataInput(formElems1, formData1);
    expect(result).toStrictEqual({
      errorId: 'minLength',
      status: 400,
      message: "ElemId 'myElem1' value is too short (minLength: 3).",
      elemId: 'myElem1',
      customError: { langKey: 'Too short' },
    });

    const formData2 = [
      {
        elemId: 'myElem1',
        value: '141253523532564364534534',
      },
      {
        elemId: 'myElem2',
        value: '1',
      },
    ];
    result = validateFormDataInput(formElems1, formData2);
    expect(result).toStrictEqual({
      errorId: 'maxLength',
      status: 400,
      message: "ElemId 'myElem1' value is too long (maxLength: 10).",
      elemId: 'myElem1',
    });

    const formData3 = [
      {
        elemId: 'myElem1',
        value: '141sfsa',
      },
      {
        elemId: 'myElem2',
        value: '1',
      },
    ];
    result = validateFormDataInput(formElems1, formData3);
    expect(result).toStrictEqual({
      errorId: 'validationRegExp',
      status: 400,
      message: "ElemId 'myElem1' failed to validate for regExp.",
      elemId: 'myElem1',
    });

    const formData4 = [
      {
        elemId: 'myElem1',
        value: 1234546,
      },
      {
        elemId: 'myElem2',
        value: '1',
      },
    ];
    result = validateFormDataInput(formElems1, formData4);
    expect(result).toStrictEqual({
      errorId: 'invalidValueType',
      status: 400,
      message: "ElemId 'myElem1' value is not of required valueType ('string').",
      elemId: 'myElem1',
    });

    const formData5 = [
      {
        elemId: 'myElem2',
        value: '1',
      },
    ];
    result = validateFormDataInput(formElems1, formData5);
    expect(result).toStrictEqual({
      errorId: 'required',
      status: 400,
      message: "ElemId 'myElem1' value is required.",
      elemId: 'myElem1',
    });

    const formData6 = [
      {
        elemId: 'myElem1',
        value: '1415435',
      },
      {
        elemId: 'myElem2',
        value: '1',
      },
    ];
    result = validateFormDataInput(formElems1, formData6);
    expect(result).toBe(null);

    const formElems2 = [
      {
        elemId: 'myElem1',
        orderNr: 0,
        elemType: 'inputNumber',
        valueType: 'number',
        elemData: { minValue: 3, maxValue: 10 },
        required: true,
        mustMatchValue: 'myElem2',
      },
      {
        elemId: 'myElem2',
        orderNr: 1,
        elemType: 'inputNumber',
        valueType: 'number',
        required: true,
      },
    ] as FormElem[];
    const formData7 = [
      {
        elemId: 'myElem1',
        value: 5,
      },
      {
        elemId: 'myElem2',
        value: 7,
      },
    ];
    result = validateFormDataInput(formElems2, formData7);
    expect(result).toStrictEqual({
      errorId: 'mustMatchValue',
      status: 400,
      message: "ElemId 'myElem1' must match elemId 'myElem2' value.",
      elemId: 'myElem1',
    });

    const formData8 = [
      {
        elemId: 'myElem1',
        value: 0,
      },
      {
        elemId: 'myElem2',
        value: 0,
      },
    ];
    result = validateFormDataInput(formElems2, formData8);
    expect(result).toStrictEqual({
      errorId: 'minValue',
      status: 400,
      message: "ElemId 'myElem1' value is too small (minValue: 3).",
      elemId: 'myElem1',
    });

    const formData9 = [
      {
        elemId: 'myElem1',
        value: 200,
      },
      {
        elemId: 'myElem2',
        value: 200,
      },
    ];
    result = validateFormDataInput(formElems2, formData9);
    expect(result).toStrictEqual({
      errorId: 'maxValue',
      status: 400,
      message: "ElemId 'myElem1' value is too large (maxValue: 10).",
      elemId: 'myElem1',
    });

    const formElems3 = [
      {
        elemId: 'myElem1',
        orderNr: 0,
        elemType: 'inputText',
        valueType: 'string',
        validationFn: 'email',
        required: true,
      },
    ] as FormElem[];
    const formData10 = [
      {
        elemId: 'myElem1',
        value: 'jfkdskj',
      },
    ];
    result = validateFormDataInput(formElems3, formData10);
    expect(result).toStrictEqual({
      errorId: 'validationFn',
      status: 400,
      message: "ElemId 'myElem1' value failed validation with 'email' validator.",
      elemId: 'myElem1',
    });

    const formData11 = [
      {
        elemId: 'myElem1',
        value: 'firstname.lastname@council',
      },
    ];
    result = validateFormDataInput(formElems3, formData11);
    expect(result).toStrictEqual(null);

    const formElems4 = [
      {
        elemId: 'myElem1',
        orderNr: 0,
        elemType: 'inputText',
        valueType: 'string',
        elemData: { maxLength: 8 },
      },
    ] as FormElem[];
    const formData12 = [
      {
        elemId: 'myElem1',
        value: '$@ÄÅÖäåö',
      },
    ];
    result = validateFormDataInput(formElems4, formData12);
    expect(result).toBe(null);
  });

  it('validateLoginMethod', async () => {
    const app = await initApp();
    const simpleId = 'loginMethod';

    const newSetting = new DBSystemSettingModel({
      simpleId,
      value: 'USERNAME_ONLY',
      category: 'security',
      systemDocument: true,
    });
    await newSetting.save();
    await setCachedSysSettings();

    let result = await validateLoginMethod('username');
    expect(result).toBe(null);

    result = await validateLoginMethod('email');
    expect(result?.code).toBe('UNAUTHORIZED');

    await DBSystemSettingModel.findOneAndUpdate({ simpleId }, { value: 'EMAIL_ONLY' });
    await setCachedSysSettings();

    result = await validateLoginMethod('username');
    expect(result?.code).toBe('UNAUTHORIZED');

    result = await validateLoginMethod('email');
    expect(result).toBe(null);

    await DBSystemSettingModel.findOneAndUpdate(
      { simpleId },
      { value: 'USER_CHOOSES_USERNAME_AS_DEFAULT' }
    );
    await setCachedSysSettings();

    result = await validateLoginMethod('username');
    expect(result).toBe(null);

    result = await validateLoginMethod('email');
    expect(result).toBe(null);

    await DBSystemSettingModel.findOneAndUpdate(
      { simpleId },
      { value: 'USER_CHOOSES_EMAIL_AS_DEFAULT' }
    );
    await setCachedSysSettings();

    result = await validateLoginMethod('username');
    expect(result).toBe(null);

    result = await validateLoginMethod('email');
    expect(result).toBe(null);

    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });
});

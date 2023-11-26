import type { FastifyError } from 'fastify';

import type { Body } from '../features/publicSignUp/schemas';
import { errors } from '../core/errors';
import type { DBUser } from '../dbModels/user';
import { getConfig, type ConfigFile } from '../core/config';
import type { FormElem } from '../dbModels/_modelTypePartials';
import { customValidators } from './customValidations';

export type ValidationError = FastifyError | null;

export const validatePublicSignup = (
  body: Body,
  foundUser: DBUser | null,
  options?: Partial<ConfigFile['user']>
): ValidationError => {
  const username = body.username.trim();
  const pass = body.pass.trim();

  if (foundUser) {
    return new errors.USERNAME_TAKEN(username);
  }

  const minUserLength =
    options?.minUsernameLength || getConfig<number>('user.minUsernameLength', 2);
  if (username.length < minUserLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Username is too short, minimum is ${minUserLength} characters.`
    );
  }
  const maxUserLength =
    options?.maxUsernameLength || getConfig<number>('user.maxUsernameLength', 32);
  if (username.length > maxUserLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Username is too long, maximum is ${maxUserLength} characters.`
    );
  }
  if (!validateSimpleId(username)) {
    return new errors.COUNCL_ERR_VALIDATE(
      'Username contains invalid characters, only a-z, A-Z, 0-9, -, and _ allowed.'
    );
  }
  const minPassLength = options?.minPassLength || getConfig<number>('user.minPassLength', 8);
  if (pass.length < minPassLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Password is too short, minimum is ${minPassLength} characters.`
    );
  }
  const maxPassLength = options?.maxPassLength || getConfig<number>('user.maxPassLength', 128);
  if (pass.length > maxPassLength) {
    return new errors.COUNCL_ERR_VALIDATE(
      `Password is too long, maximum is ${maxPassLength} characters.`
    );
  }
  if (!validatePassword(pass)) {
    return new errors.COUNCL_ERR_VALIDATE(
      getConfig<string>('user.passNotValidMessage.langKey', 'Password not valid')
    );
  }
  return null;
};

export const simpleIdRegExp = ['^[a-zA-Z0-9-_]+$', 'gm'];
export const validateSimpleId = (simpleId: unknown) => {
  if (typeof simpleId !== 'string' || !simpleId) return false;
  const regex = new RegExp(simpleIdRegExp[0], simpleIdRegExp[1]);
  return regex.test(simpleId);
};

export const validateEmail = (value: unknown) =>
  // case insensitive
  new RegExp(
    "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
  ).test(String(value));

export const validatePhoneWithExtraChars = (value: unknown) => {
  // phone number validation, with extra characters allowed:
  // +[space]-()
  if (!value) return false;
  const strippedNumber = String(value)
    .replace('+', '')
    .replaceAll(' ', '')
    .replaceAll('-', '')
    .replace('(', '')
    .replace(')', '');
  return !isNaN(Number(strippedNumber));
};

export const validatePassword = (value: unknown, alternateRegex?: string) => {
  const passRegex = alternateRegex || getConfig<string>('user.passRegExp', '');
  if (!passRegex) return true;
  return new RegExp(passRegex).test(String(value));
};

export const isValueAndTypeValid = (valueType: string, value: unknown): boolean => {
  let forgedDate;
  switch (valueType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'date':
      try {
        forgedDate = new Date(String(value)).toISOString();
      } catch (e) {
        return false;
      }
      return forgedDate === value;
    case 'unknown':
    case 'none':
      return true;
  }
  return false;
};

export const validateFormDataInput = (
  formElems: FormElem[],
  formData: { elemId: string; value: unknown }[]
) => {
  for (let i = 0; i < formElems.length; i++) {
    const elem = formElems[i];
    if (!elem.doNotSave) {
      // Find elemId and value
      const sentElem = formData.find((item) => item.elemId === elem.elemId);

      // required
      if (sentElem?.value === undefined && elem.required) {
        // required error
        const defaultError = `ElemId '${elem.elemId}' value is required.`;
        const customError =
          elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'required');
        new errors.FORM_DATA_BAD_REQUEST(
          `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}.`
        );
        return {
          errorId: 'required',
          message: defaultError,
          elemId: elem.elemId,
          ...(customError?.message ? { customError: customError.message } : {}),
        };
      }

      // valueType check
      if (!isValueAndTypeValid(elem.valueType, sentElem?.value)) {
        // valueType invalid error
        const defaultError = `ElemId '${elem.elemId}' value is not of required valueType ('${elem.valueType}').`;
        const customError =
          elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'invalidValueType');
        new errors.FORM_DATA_BAD_REQUEST(
          `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
        );
        return {
          errorId: 'invalidValueType',
          message: defaultError,
          elemId: elem.elemId,
          ...(customError?.message ? { customError: customError.message } : {}),
        };
      }

      // mustMatchValue
      if (elem.mustMatchValue) {
        // compare values
        const compareToValue = formData.find((item) => item.elemId === elem.mustMatchValue)?.value;
        if (compareToValue !== sentElem) {
          // mustMatchValue error
          const defaultError = `ElemId '${elem.elemId}' must match elemId '${elem.mustMatchValue}' value.`;
          const customError =
            elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'mustMatchValue');
          new errors.FORM_DATA_BAD_REQUEST(
            `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
          );
          return {
            errorId: 'mustMatchValue',
            message: defaultError,
            elemId: elem.elemId,
            ...(customError?.message ? { customError: customError.message } : {}),
          };
        }
      }

      // validationFn
      if (elem.validationFn) {
        // find custom validator function and validate
        const validator = customValidators[elem.validationFn];
        if (validator?.validatorFn !== undefined) {
          if (!validator?.validatorFn(sentElem?.value)) {
            const defaultError = `ElemId '${elem.elemId}' value failed validation with ${elem.validationFn} custom validator.`;
            const customError =
              elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'validationFn');
            new errors.FORM_DATA_BAD_REQUEST(
              `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
            );
            return {
              errorId: 'validationFn',
              message: defaultError,
              elemId: elem.elemId,
              ...(customError?.message ? { customError: customError.message } : {}),
            };
          }
        }
      }

      // validationRegExp
      if (
        elem.valueType === 'string' &&
        elem.validationRegExp &&
        typeof elem.validationRegExp.pattern === 'string'
      ) {
        // create regex and validate
        const regex = new RegExp(elem.validationRegExp.pattern, elem.validationRegExp.flags || '');
        if (!regex.test(sentElem?.value as string)) {
          const defaultError = `ElemId '${elem.elemId}' failed to validate for regExp.`;
          const customError =
            elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'validationRegExp');
          new errors.FORM_DATA_BAD_REQUEST(
            `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
          );
          return {
            errorId: 'validationRegExp',
            message: defaultError,
            elemId: elem.elemId,
            ...(customError?.message ? { customError: customError.message } : {}),
          };
        }
      }

      // elemData validation
      const elemDataValidationError = elemDataValidation(elem, sentElem);
      if (elemDataValidationError) {
        return elemDataValidationError;
      }
    }
  }
  return null;
};

const elemDataValidation = (
  elem: FormElem,
  sentElem: { elemId: string; value: unknown } | undefined
) => {
  if (elem.valueType === 'string' && sentElem) {
    const value = sentElem.value as string;
    // string minLength
    if (((elem.elemData?.minLength as number) || 0) > value.length) {
      const defaultError = `ElemId '${elem.elemId}' value is too short (minLength: ${
        elem.elemData?.minLength as number
      }).`;
      const customError =
        elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'minLength');
      new errors.FORM_DATA_BAD_REQUEST(
        `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
      );
      return {
        errorId: 'minLength',
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
    // string maxLength
    if (((elem.elemData?.maxLength as number) || 0) < value.length) {
      const defaultError = `ElemId '${elem.elemId}' value is too long (maxLength: ${
        elem.elemData?.maxLength as number
      }).`;
      const customError =
        elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'maxLength');
      new errors.FORM_DATA_BAD_REQUEST(
        `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
      );
      return {
        errorId: 'maxLength',
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
  }

  if (elem.valueType === 'number' && sentElem) {
    const value = sentElem.value as number;
    // number minValue
    if (((elem.elemData?.minValue as number) || 0) > value) {
      const defaultError = `ElemId '${elem.elemId}' value is too small (minValue: ${
        elem.elemData?.minValue as number
      }).`;
      const customError =
        elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'minValue');
      new errors.FORM_DATA_BAD_REQUEST(
        `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
      );
      return {
        errorId: 'minValue',
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
    // number maxValue
    if (((elem.elemData?.maxValue as number) || 0) < value) {
      const defaultError = `ElemId '${elem.elemId}' value is too large (maxValue: ${
        elem.elemData?.maxValue as number
      }).`;
      const customError =
        elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'maxValue');
      new errors.FORM_DATA_BAD_REQUEST(
        `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
      );
      return {
        errorId: 'maxValue',
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
  }

  return null;
};

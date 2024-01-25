import type { FastifyError } from 'fastify';

import { errors } from '../core/errors';
import { getConfig, getSysSetting } from '../core/config';
import type { FormElem, TransText } from '../dbModels/_modelTypePartials';
import { customValidators } from '../customFunctions/validation';

export type ValidationError = FastifyError | null;

export const simpleIdRegExp = ['^[a-zA-Z0-9-_]+$', 'gm'];
export const validateSimpleId = (simpleId: unknown) => {
  if (typeof simpleId !== 'string') return false;
  if (!simpleId) return true; // The check for empty is handled with 'required' param
  const regex = new RegExp(simpleIdRegExp[0], simpleIdRegExp[1]);
  return regex.test(simpleId);
};

export const validateEmail = (value: unknown) => {
  // case insensitive
  if (value === undefined) return true;
  if (typeof value !== 'string') return false;
  if (!value) return true; // The check for empty is handled with 'required' param
  return new RegExp(
    "[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?"
  ).test(String(value));
};

export const validatePhoneWithExtraChars = (value: unknown) => {
  // phone number validation, with extra characters allowed:
  // +[space]-()
  if (value === undefined) return true;
  if (typeof value !== 'string' && typeof value !== 'number') return false;
  if (!value) return true; // The check for empty is handled with 'required' param
  const strippedNumber = String(value)
    .replace('+', '')
    .replaceAll(' ', '')
    .replaceAll('-', '')
    .replace('(', '')
    .replace(')', '');
  return !isNaN(Number(strippedNumber));
};

export const validatePassword = (value: unknown, alternateRegex?: string) => {
  const passRegex = alternateRegex || getConfig<string>('security.passRegExp', '');
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
          status: 400,
          message: defaultError,
          elemId: elem.elemId,
          ...(customError?.message ? { customError: customError.message } : {}),
        };
      }

      // valueType check
      if (
        (elem.required || sentElem?.value !== undefined) &&
        !isValueAndTypeValid(elem.valueType, sentElem?.value)
      ) {
        // valueType invalid error
        const defaultError = `ElemId '${elem.elemId}' value is not of required valueType ('${elem.valueType}').`;
        const customError =
          elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'invalidValueType');
        new errors.FORM_DATA_BAD_REQUEST(
          `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
        );
        return {
          errorId: 'invalidValueType',
          status: 400,
          message: defaultError,
          elemId: elem.elemId,
          ...(customError?.message ? { customError: customError.message } : {}),
        };
      }

      // mustMatchValue
      if (elem.mustMatchValue) {
        // compare values
        const compareToValue = formData.find((item) => item.elemId === elem.mustMatchValue)?.value;
        if (compareToValue !== sentElem?.value) {
          // mustMatchValue error
          const defaultError = `ElemId '${elem.elemId}' must match elemId '${elem.mustMatchValue}' value.`;
          const customError =
            elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'mustMatchValue');
          new errors.FORM_DATA_BAD_REQUEST(
            `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
          );
          return {
            errorId: 'mustMatchValue',
            status: 400,
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
            const defaultError = `ElemId '${elem.elemId}' value failed validation with '${elem.validationFn}' validator.`;
            const customError =
              elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'validationFn');
            new errors.FORM_DATA_BAD_REQUEST(
              `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
            );
            return {
              errorId: 'validationFn',
              status: 400,
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
            status: 400,
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
  // @TODO: value.length is not the right way to count length for strings.
  // Will work fine for a-z characters, but special characters will be longer than 1.
  // Implement a proper character count.
  if (elem.valueType === 'string' && sentElem) {
    const value = sentElem.value as string;
    // string minLength
    if (
      elem.elemData?.minLength !== undefined &&
      (elem.elemData?.minLength as number) > value.length
    ) {
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
        status: 400,
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
    // string maxLength
    if (
      elem.elemData?.maxLength !== undefined &&
      (elem.elemData?.maxLength as number) < value.length
    ) {
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
        status: 400,
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
  }

  if (elem.valueType === 'number' && sentElem) {
    const value = sentElem.value as number;
    // number minValue
    if (elem.elemData?.minValue !== undefined && (elem.elemData?.minValue as number) > value) {
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
        status: 400,
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
    // number maxValue
    if (elem.elemData?.maxValue !== undefined && (elem.elemData?.maxValue as number) < value) {
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
        status: 400,
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
  }

  if (elem.elemData?.options && sentElem) {
    // Validate options
    const options = elem.elemData.options as { langKey: TransText; value: unknown }[];
    if (!options.find((opt) => opt.value === sentElem?.value)) {
      const defaultError = `ElemId '${elem.elemId}' value is not one of the options: ${options
        .map((opt) => opt.value)
        .toString()}).`;
      const customError =
        elem.inputErrors && elem.inputErrors.find((err) => err.errorId === 'invalidOption');
      new errors.FORM_DATA_BAD_REQUEST(
        `${defaultError}${customError ? ' customError: ' + JSON.stringify(customError) : ''}`
      );
      return {
        errorId: 'invalidOption',
        status: 400,
        message: defaultError,
        elemId: elem.elemId,
        ...(customError?.message ? { customError: customError.message } : {}),
      };
    }
  }

  return null;
};

export const validateLoginMethod = async (loginMethod: string): Promise<FastifyError | null> => {
  const loginMethodSetting = await getSysSetting<string>('loginUserOrEmailMethod');
  if (
    (loginMethodSetting === 'USERNAME_ONLY' && loginMethod !== 'username') ||
    (loginMethodSetting === 'EMAIL_ONLY' && loginMethod !== 'email')
  ) {
    return new errors.UNAUTHORIZED(`Users' are not allowed login by ${loginMethod}`);
  }
  return null;
};

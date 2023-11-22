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

  // Check lengths
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
  // @TODO: add username (simpleId) regex
  // @TODO: add password regex
  return null;
};

export const simpleIdRegExp = ['^[a-zA-Z0-9-_]+$', 'gm'];
export const validateSimpleId = (simpleId: string) => {
  const regex = new RegExp(simpleIdRegExp[0], simpleIdRegExp[1]);
  return regex.test(simpleId);
};

export const isValueAndTypeValid = (valueType: string, value: unknown): boolean => {
  switch (valueType) {
    case 'string':
      return typeof value === 'string';
    case 'number':
      return typeof value === 'number';
    case 'date':
      return new Date(String(value)).toISOString() === value;
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
      if (elem.validationFn) {
        // find custom validator function and validate
        const validator = customValidators[elem.validationFn];
        if (validator?.validatorFn !== undefined) {
          if (!validator?.validatorFn(sentElem?.value)) {
            // validationFn error
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
      if (
        elem.valueType === 'string' &&
        elem.validationRegExp &&
        typeof elem.validationRegExp.pattern === 'string'
      ) {
        // create regex and validate
        const regex = new RegExp(elem.validationRegExp.pattern, elem.validationRegExp.flags || '');
        if (!regex.test(sentElem?.value as string)) {
          // validationRegExp error
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
    }
  }
  return null;
};

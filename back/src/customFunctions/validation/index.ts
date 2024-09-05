import type { TransText } from '../../@types/form.js';
import {
  emailValidator,
  phoneWithExtraValidator,
  simpleIdValidator,
} from './validatorDefinitions.js';

type CustomValidator = {
  [key: string]: {
    name: TransText;
    description: TransText;
    errorMsg: TransText; // @CONSIDER: is this needed? There is the inputError..
    validatorFn: (value: unknown) => boolean;
  };
};

export const customValidators: CustomValidator = {
  email: emailValidator,
  phoneWithExtra: phoneWithExtraValidator,
  simpleId: simpleIdValidator,
};

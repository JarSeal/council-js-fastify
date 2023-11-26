import type { TransText } from '../../@types/form';
import { emailValidator, phoneWithExtraValidator, simpleIdValidator } from './validatorDefinitions';

type CustomValidator = {
  [key: string]: {
    name: TransText;
    description: TransText;
    errorMsg: TransText;
    validatorFn: (value: unknown) => boolean;
  };
};

export const customValidators: CustomValidator = {
  email: emailValidator,
  phoneWithExtra: phoneWithExtraValidator,
  simpleId: simpleIdValidator,
};

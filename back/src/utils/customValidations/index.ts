import type { TransText } from '../../@types/form';
import { emailValidator, phoneWithExtraValidator } from './emailAndPhone';

type CustomValidator = {
  [key: string]: {
    name: TransText;
    description: TransText;
    validatorFn: (value: unknown) => boolean;
  };
};

export const customValidators: CustomValidator = {
  email: emailValidator,
  phoneWithExtra: phoneWithExtraValidator,
};

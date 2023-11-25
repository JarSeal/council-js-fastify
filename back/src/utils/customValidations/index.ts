import type { TransText } from '../../@types/form';
import { validateSimpleId } from '../validation';
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
  simpleId: {
    name: { langKey: 'Simple ID' },
    description: {
      langKey:
        'Validates a simpleId. A simpleId can only contain english characters from a-z and A-Z, numbers 0-9, and dashes or underscores.',
    },
    validatorFn: (value: unknown) => {
      if (typeof value !== 'string') return false;
      return validateSimpleId(value);
    },
  },
};

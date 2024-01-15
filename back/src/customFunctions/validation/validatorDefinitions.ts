import {
  validateEmail,
  validatePhoneWithExtraChars,
  validateSimpleId,
} from '../../utils/validation';

export const emailValidator = {
  name: { langKey: 'Email' },
  description: { langKey: 'Validates an email value (case insensitive).' },
  errorMsg: { langKey: 'Not a valid email' },
  validatorFn: (value: unknown) => validateEmail(value),
};

export const phoneWithExtraValidator = {
  name: { langKey: 'Phone number plus extra' },
  description: { langKey: 'Validates a phone number that has extra characters [+ -()].' },
  errorMsg: { langKey: 'Not a valid phone number' },
  validatorFn: (value: unknown) => validatePhoneWithExtraChars(value),
};

export const simpleIdValidator = {
  name: { langKey: 'Simple ID' },
  description: {
    langKey:
      'Validates a simpleId. A simpleId can only contain english characters from a-z and A-Z, numbers 0-9, and dashes or underscores.',
  },
  errorMsg: { langKey: 'Not a valid Simple ID (a-z, A-Z, 0-9, -, and _)' },
  validatorFn: (value: unknown) => validateSimpleId(value),
};

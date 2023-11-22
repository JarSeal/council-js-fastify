export const emailValidator = {
  name: { langKey: 'Email validator' },
  description: { langKey: 'Validates an email value (case insensitive).' },
  validatorFn: (value: unknown) =>
    // case insensitive
    /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/.test(
      String(value)
    ),
};

export const phoneWithExtraValidator = {
  name: { langKey: 'Phone number with extra characters' },
  description: { langKey: 'Validates a phone number that has extra characters [+ -()].' },
  validatorFn: (value: unknown) => {
    // phone number validation, with extra characters allowed:
    // +[space]-()
    const strippedNumber = String(value)
      .replace('+', '')
      .replaceAll(' ', '')
      .replaceAll('-', '')
      .replace('(', '')
      .replace(')', '');
    return !isNaN(Number(strippedNumber));
  },
};

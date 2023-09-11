// FORMS:
const timeNow = new Date();
const { getConfig } = require('../../dist/back/src/core/config');
const { simpleIdRegex } = require('../../dist/back/src/features/utils/validation');

if (!getConfig) {
  console.error(
    'Build the project before running migrations (in the project root run: "yarn build").'
  );
  throw new Error('Build files not found!');
}

module.exports = [
  // System login
  {
    simpleId: 'systemLogin',
    name: 'System Login',
    description: 'Council system login form.',
    created: {
      user: null,
      date: timeNow,
    },
    edited: [],
    systemDocument: true,
    owner: null,
    url: '/api/v1/login',
    form: {
      formTitleLangKey: 'Login',
      formElems: [
        {
          elemId: 'loginMethod',
          orderNr: 0,
          elemType: 'inputRadioGroup',
          elemData: {
            defaultValue: 'username',
            options: [
              {
                labelLangKey: 'Username',
                value: 'username',
              },
              {
                labelLangKey: 'Email',
                value: 'email',
              },
            ],
          },
          labelLangKey: 'Login method',
          required: true,
        },
        {
          elemId: 'usernameOrEmail',
          orderNr: 1,
          elemType: 'inputText',
          labelLangKey: 'Username',
          required: true,
        },
        {
          elemId: 'pass',
          orderNr: 2,
          elemType: 'inputText',
          elemData: { password: true },
          labelLangKey: 'Password',
          required: true,
        },
        {
          elemId: 'agentId',
          orderNr: 3,
          elemType: 'hidden',
          required: true,
        },
      ],
    },
  },

  // Public sign up
  {
    simpleId: 'publicSignUp',
    name: 'Public sign up',
    description: 'Council public sign-up form.',
    created: {
      user: null,
      date: timeNow,
    },
    edited: [],
    systemDocument: true,
    owner: null,
    url: '/api/v1/publicsignup',
    form: {
      formTitleLangKey: 'Sign up',
      formElems: [
        {
          elemId: 'username',
          orderNr: 0,
          elemType: 'inputText',
          elemData: {
            minLength: getConfig('user.minUsernameLength', 2),
            maxLength: getConfig('user.maxUsernameLength', 32),
          },
          labelLangKey: 'Username',
          required: true,
          validationRegExp: simpleIdRegex,
          errors: [
            {
              errorId: 'validationRegExp',
              messageLangKey:
                'Invalid input, only letters (a-z), numbers, "-", and "_" are allowed.',
            },
          ],
        },
        {
          elemId: 'email',
          orderNr: 1,
          elemType: 'inputText',
          elemData: { email: true },
          labelLangKey: 'E-mail',
          required: true,
          mustMatchValue: 'emailAgain',
          errors: [
            {
              errorId: 'mustMatchValue',
              messageLangKey: 'E-mails do not match',
            },
          ],
        },
        {
          elemId: 'emailAgain',
          orderNr: 2,
          elemType: 'inputText',
          elemData: { email: true },
          labelLangKey: 'E-mail again',
          required: true,
          mustMatchValue: 'email',
          errors: [
            {
              errorId: 'mustMatchValue',
            },
          ],
        },
        {
          elemId: 'pass',
          orderNr: 3,
          elemType: 'inputText',
          elemData: {
            password: true,
            minLength: getConfig('user.minPassLength'),
            maxLength: getConfig('user.maxPassLength'),
          },
          labelLangKey: 'Password',
          required: true,
          validationRegExp: getConfig('user.passRegExp'),
          mustMatchValue: 'passAgain',
          errors: [
            {
              errorId: 'validationRegExp',
              messageLangKey:
                'Password must contain at least: lower and upper case, number, special character (!#$%&?@* )',
            },
            {
              errorId: 'mustMatchValue',
              messageLangKey: 'Passwords do not match',
            },
          ],
        },
        {
          elemId: 'passAgain',
          orderNr: 4,
          elemType: 'inputText',
          elemData: { password: true },
          labelLangKey: 'Password again',
          required: true,
          mustMatchValue: 'pass',
          errors: [
            {
              errorId: 'mustMatchValue',
            },
          ],
        },
      ],
    },
  },
];

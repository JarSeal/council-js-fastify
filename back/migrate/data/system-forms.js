// FORMS:
const timeNow = new Date();
const { getConfig } = require('../../dist/back/src/core/config');
const { simpleIdRegex } = require('../../dist/back/src/utils/validation');

if (!getConfig || simpleIdRegex) {
  console.error(
    'Build the project before running migrations (in the project root run: "yarn build").'
  );
  throw new Error('Build files not found!');
}

const getForms = async (db) => {
  const result = await db.collection('groups').findOne({ simpleId: 'basicUsers' });
  const basicUsersId = result._id;
  return [
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
        formTitle: { langKey: 'Login' },
        formElems: [
          {
            elemId: 'loginMethod',
            orderNr: 0,
            elemType: 'inputRadioGroup',
            elemData: {
              defaultValue: 'username',
              options: [
                {
                  label: { langKey: 'Username' },
                  value: 'username',
                },
                {
                  label: { langKey: 'Email' },
                  value: 'email',
                },
              ],
            },
            label: { langKey: 'Login method' },
            required: true,
          },
          {
            elemId: 'usernameOrEmail',
            orderNr: 1,
            elemType: 'inputText',
            label: { langKey: 'Username or Email' },
            required: true,
          },
          {
            elemId: 'pass',
            orderNr: 2,
            elemType: 'inputText',
            elemData: { password: true },
            label: { langKey: 'Password' },
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
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__systemLogin__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'systemLogin',
          priAccessId: 'canUseForm',
          name: 'Use form: System Login',
          description: 'Who can use the "System Login" form.',
          created: timeNow,
          privilegeAccess: {
            public: 'onlyPublic',
            requireCsrfHeader: true,
            users: [],
            groups: [],
            excludeUsers: [],
            excludeGroups: [],
          },
        },
      ],
    },

    // Public sign up
    {
      simpleId: 'publicSignUp',
      name: 'Public Sign Up',
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
        formTitle: { langKey: 'Sign up' },
        formElems: [
          {
            elemId: 'username',
            orderNr: 0,
            elemType: 'inputText',
            elemData: {
              minLength: getConfig('user.minUsernameLength', 2),
              maxLength: getConfig('user.maxUsernameLength', 32),
            },
            label: { langKey: 'Username' },
            required: true,
            validationRegExp: simpleIdRegex,
            errors: [
              {
                errorId: 'validationRegExp',
                message: {
                  langKey: 'Invalid input, only letters (a-z), numbers, "-", and "_" are allowed.',
                },
              },
            ],
          },
          {
            elemId: 'email',
            orderNr: 1,
            elemType: 'inputText',
            elemData: { email: true },
            label: { langKey: 'E-mail' },
            required: true,
            mustMatchValue: 'emailAgain',
            errors: [
              {
                errorId: 'mustMatchValue',
                message: { langKey: 'E-mails do not match' },
              },
            ],
          },
          {
            elemId: 'emailAgain',
            orderNr: 2,
            elemType: 'inputText',
            elemData: { email: true },
            label: { langKey: 'E-mail again' },
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
            label: { langKey: 'Password' },
            required: true,
            validationRegExp: getConfig('user.passRegExp'),
            mustMatchValue: 'passAgain',
            errors: [
              {
                errorId: 'validationRegExp',
                message: {
                  langKey:
                    'Password must contain at least: lower and upper case, number, special character (!#$%&?@* )',
                },
              },
              {
                errorId: 'mustMatchValue',
                message: { langKey: 'Passwords do not match' },
              },
            ],
          },
          {
            elemId: 'passAgain',
            orderNr: 4,
            elemType: 'inputText',
            elemData: { password: true },
            label: { langKey: 'Password again' },
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
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__publicSignUp__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'publicSignUp',
          priAccessId: 'canUseForm',
          name: 'Use form: Public Sign Up',
          description: 'Who can use the "Public Sign Up" form.',
          created: timeNow,
          privilegeAccess: {
            public: 'onlyPublic',
            requireCsrfHeader: true,
            users: [],
            groups: [],
            excludeUsers: [],
            excludeGroups: [],
          },
        },
      ],
    },

    // Logout
    {
      simpleId: 'logout',
      name: 'Council Logout',
      description: 'Council universal logout.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/logout',
      form: {
        formElems: [
          {
            elemId: 'redirectUrl',
            orderNr: 0,
            elemType: 'hidden',
          },
        ],
      },
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__logout__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'logout',
          priAccessId: 'canUseForm',
          name: 'Use form: Council Logout',
          description: 'Who can use the "Council Logout" form.',
          created: timeNow,
          privilegeAccess: {
            public: 'false',
            requireCsrfHeader: true,
            users: [],
            groups: [],
            excludeUsers: [],
            excludeGroups: [],
          },
        },
      ],
    },

    // UserData
    {
      simpleId: 'userData',
      name: 'User data',
      description: 'Council user data.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/userdata',
      form: {
        formElems: [
          {
            elemId: 'userId',
            orderNr: 0,
            elemType: 'hidden',
            privileges: {
              read: {
                public: 'false',
                requireCsrfHeader: true,
                users: [],
                groups: [],
                excludeUsers: [],
                excludeGroups: [],
              },
              edit: {
                public: 'false',
                requireCsrfHeader: true,
                users: [],
                groups: [],
                excludeUsers: [],
                excludeGroups: [],
              },
            },
          },
          {
            elemId: 'Full name',
            orderNr: 1,
            elemType: 'inputText',
          },
        ],
      },
      formDataDefaultPrivileges: {
        read: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
        edit: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
        create: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
        delete: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
      },
      privileges: [
        {
          simpleId: 'form__userData__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'userData',
          priAccessId: 'canUseForm',
          name: 'Use form: Council User data',
          description: 'Who can use the "Council User data" form.',
          created: timeNow,
          privilegeAccess: {
            public: 'false',
            requireCsrfHeader: true,
            users: [],
            groups: [basicUsersId],
            excludeUsers: [],
            excludeGroups: [],
          },
        },
      ],
    },
  ];
};

module.exports = getForms;

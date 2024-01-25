// FORMS:
const timeNow = new Date();
const { getConfig } = require('../../dist/back/src/core/config');
const { simpleIdRegex } = require('../../dist/back/src/utils/validation');
const systemSettings = require('./_system-settings');

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
      url: '/api/v1/sys/login',
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
      url: '/api/v1/sys/public-signup',
      form: {
        formTitle: { langKey: 'Sign up' },
        formElems: [
          {
            elemId: 'username',
            orderNr: 0,
            elemType: 'inputText',
            elemData: {
              minLength: getConfig('security.minUsernameLength', 2),
              maxLength: getConfig('security.maxUsernameLength', 32),
            },
            label: { langKey: 'Username' },
            required: true,
            validationRegExp: { pattern: simpleIdRegex[0], flags: simpleIdRegex[1] },
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
              minLength: getConfig('security.minPassLength', 8),
              maxLength: getConfig('security.maxPassLength', 128),
            },
            label: { langKey: 'Password' },
            required: true,
            validationRegExp: { pattern: getConfig('security.passRegExp', '')[0] },
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
      url: '/api/v1/sys/logout',
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
      name: 'User Data',
      description: 'Council User Data.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      maxDataCreatorDocs: 1,
      owner: null,
      addFillerToPrivileges: ['$read.users', '$edit.users', '$delete.users'],
      url: '/api/v1/sys/user-data',
      afterCreateFn: ['checkAndSetRequiredActions'],
      afterEditFn: ['checkAndSetRequiredActions'],
      afterDeleteFn: ['checkAndSetRequiredActions'],
      form: {
        formElems: [
          {
            elemId: 'userId',
            orderNr: 0,
            elemType: 'hidden',
            valueType: 'string',
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
            elemId: 'fullName',
            orderNr: 1,
            elemType: 'inputText',
            valueType: 'string',
            elemData: { maxLength: 200, category: { langKey: 'General' } },
            label: { langKey: 'Full name' },
          },
          {
            elemId: 'description',
            orderNr: 2,
            elemType: 'inputText',
            valueType: 'string',
            elemData: {
              multiline: true,
              maxLength: 1000,
              hasCharCounter: true,
              category: { langKey: 'General' },
            },
            label: { langKey: 'Profile description' },
          },
          {
            elemId: 'phonenumber',
            orderNr: 3,
            elemType: 'inputText',
            valueType: 'string',
            elemData: { maxLength: 20, category: { langKey: 'General' } },
            label: { langKey: 'Phone number' },
            validationFn: 'phoneWithExtra',
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
          name: 'Use form: Council User Data',
          description: 'Who can use the "Council User Data" form.',
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

    // UserSettings
    {
      simpleId: 'userSettings',
      name: 'User Settings',
      description: 'Council User Settings.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      maxDataCreatorDocs: 1,
      owner: null,
      addFillerToPrivileges: ['$read.users', '$edit.users', '$delete.users'],
      url: '/api/v1/sys/user-settings',
      form: {
        formElems: [
          {
            elemId: 'userId',
            orderNr: 0,
            elemType: 'hidden',
            valueType: 'string',
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
            elemId: 'use2FA',
            orderNr: 1,
            elemType: 'inputDropDown',
            valueType: 'boolean',
            elemData: {
              defaultValue: false,
              options: [
                { label: { langKey: 'Disabled' }, value: false },
                { label: { langKey: 'Enabled' }, value: true },
              ],
              category: 'security',
            },
            label: { langKey: 'Use 2-factor authentication' },
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
          simpleId: 'form__userSettings__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'userSettings',
          priAccessId: 'canUseForm',
          name: 'Use form: Council User Settings',
          description: 'Who can use the "Council User Settings" form.',
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

    // SystemSettings
    {
      simpleId: 'systemSettings',
      name: 'System Settings',
      description: 'Council System Settings.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/sys/system-settings',
      form: { formElems: systemSettings },
      privileges: [
        {
          simpleId: 'form__systemSettings__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'systemSettings',
          priAccessId: 'canUseForm',
          name: 'Use form: Council System Settings',
          description: 'Who can use the "Council System Settings" form.',
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
        {
          simpleId: 'form__systemSettings__canReadData',
          priCategoryId: 'form',
          priTargetId: 'systemSettings',
          priAccessId: 'canReadData',
          name: 'Read data: Council System Settings',
          description: 'Who can use read "Council System Settings" data.',
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
        {
          simpleId: 'form__systemSettings__canEditData',
          priCategoryId: 'form',
          priTargetId: 'systemSettings',
          priAccessId: 'canEditData',
          name: 'Edit data: Council System Settings',
          description: 'Who can use edit "Council System Settings" data.',
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
  ];
};

module.exports = getForms;

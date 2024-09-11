// FORMS:
const timeNow = new Date();
// const { simpleIdRegExp } = require('../../dist/utils/validation');
const { simpleIdRegExp } = import('../../dist/utils/validation.js');
const systemSettingsFormElems = require('./system-forms-settings');

// if (!simpleIdRegExp) {
//   console.error(
//     'Build the project before running migrations (in the project root run: "yarn build").'
//   );
//   throw new Error('Build files not found!');
// }

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
            elemType: 'inputRadioGroup',
            valueType: 'string',
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
            elemType: 'inputText',
            valueType: 'string',
            label: { langKey: 'Username or Email' },
            required: true,
          },
          {
            elemId: 'pass',
            elemType: 'inputText',
            valueType: 'string',
            elemData: { password: true },
            label: { langKey: 'Password' },
            required: true,
          },
          {
            elemId: 'agentId',
            elemType: 'hidden',
            valueType: 'string',
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
            elemType: 'inputText',
            valueType: 'string',
            elemData: {
              minLength: 2,
              maxLength: 32,
            },
            label: { langKey: 'Username' },
            required: true,
            validationRegExp: { pattern: simpleIdRegExp[0], flags: simpleIdRegExp[1] },
            inputErrors: [
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
            elemType: 'inputText',
            valueType: 'string',
            elemData: { email: true },
            label: { langKey: 'E-mail' },
            required: true,
            mustMatchValue: 'emailAgain',
            inputErrors: [
              {
                errorId: 'mustMatchValue',
                message: { langKey: 'E-mails do not match' },
              },
            ],
          },
          {
            elemId: 'emailAgain',
            elemType: 'inputText',
            valueType: 'string',
            elemData: { email: true },
            label: { langKey: 'E-mail again' },
            required: true,
            mustMatchValue: 'email',
            inputErrors: [
              {
                errorId: 'mustMatchValue',
              },
            ],
          },
          {
            elemId: 'pass',
            elemType: 'inputText',
            valueType: 'string',
            elemData: {
              password: true,
              minLength: 8,
              maxLength: 128,
            },
            label: { langKey: 'Password' },
            required: true,
            validationRegExp: {
              pattern: '^(?=.*[a-zäöå])(?=.*[A-ZÄÖÅ])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})',
            },
            mustMatchValue: 'passAgain',
            inputErrors: [
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
            elemType: 'inputText',
            valueType: 'string',
            elemData: { password: true },
            label: { langKey: 'Password again' },
            required: true,
            mustMatchValue: 'pass',
            inputErrors: [
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

    // Verify email
    {
      simpleId: 'verifyEmail',
      name: 'Verify email',
      description: 'Council verify email form.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/sys/user/verify-email',
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__verifyEmail__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'verifyEmail',
          priAccessId: 'canUseForm',
          name: 'Use form: Verify email',
          description: 'Who can use the "Verify email" form.',
          created: timeNow,
          privilegeAccess: {
            public: 'true',
            requireCsrfHeader: true,
            users: [],
            groups: [],
            excludeUsers: [],
            excludeGroups: [],
          },
        },
      ],
    },

    // Send verification email
    {
      simpleId: 'sendVerificationEmail',
      name: 'Send verification email',
      description: 'Council send verification email form.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/sys/user/send-verification-email/:emailIndex',
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__sendVerificationEmail__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'sendVerificationEmail',
          priAccessId: 'canUseForm',
          name: 'Use form: Send verification email',
          description: 'Who can use the "Send verification email" form.',
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

    // Forgot password
    {
      simpleId: 'forgotPassword',
      name: 'Forgot password',
      description: 'Council forgot password form.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/sys/user/forgot-password',
      form: {
        formTitle: { langKey: 'Forgot password' },
        formElems: [
          {
            elemId: 'username',
            elemType: 'inputText',
            valueType: 'string',
            label: { langKey: 'Username' },
          },
          {
            elemId: 'email',
            elemType: 'inputText',
            valueType: 'string',
            label: { langKey: 'E-mail' },
          },
        ],
      },
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__forgotPassword__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'forgotPassword',
          priAccessId: 'canUseForm',
          name: 'Use form: Forgot password',
          description: 'Who can use the "Forgot password" form.',
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

    // Reset password
    {
      simpleId: 'resetPassword',
      name: 'Reset password',
      description:
        'Council reset password form. This works with the token received from the "Forgot password" email.',
      created: {
        user: null,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      owner: null,
      url: '/api/v1/sys/user/reset-password',
      form: {
        formTitle: { langKey: 'Reset password' },
        formElems: [
          {
            elemId: 'pass',
            elemType: 'inputText',
            valueType: 'string',
            elemData: {
              password: true,
              minLength: 8,
              maxLength: 128,
            },
            label: { langKey: 'New password' },
            required: true,
            validationRegExp: {
              pattern: '^(?=.*[a-zäöå])(?=.*[A-ZÄÖÅ])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})',
            },
            mustMatchValue: 'passAgain',
            inputErrors: [
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
            elemType: 'inputText',
            valueType: 'string',
            elemData: { password: true },
            label: { langKey: 'New password again' },
            required: true,
            mustMatchValue: 'pass',
            inputErrors: [
              {
                errorId: 'mustMatchValue',
              },
            ],
          },
          {
            elemId: 'token',
            elemType: 'hidden',
            valueType: 'string',
            required: true,
          },
        ],
      },
      privileges: [
        // will be deleted from the form and set to privileges
        {
          simpleId: 'form__resetPassword__canUseForm',
          priCategoryId: 'form',
          priTargetId: 'resetPassword',
          priAccessId: 'canUseForm',
          name: 'Use form: Reset password',
          description: 'Who can use the "Reset password" form.',
          created: timeNow,
          privilegeAccess: {
            public: 'true',
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
            elemType: 'hidden',
            valueType: 'string',
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
            elemId: 'description',
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
      form: { formElems: systemSettingsFormElems },
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

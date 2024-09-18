import CONFIG from '../../CONFIG';
import { FormElem } from '../../src/dbModels/_modelTypePartials';

const systemSettingsFormElems: FormElem[] = [
  // security CATEGORY [START]
  {
    elemId: 'sessionMaxAge',
    elemType: 'inputDropDown',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.sessionMaxAge >= 30
          ? Math.round(Number(CONFIG.security.sessionMaxAge))
          : 3600,
      options: [
        { label: { langKey: '30 seconds' }, value: 30 },
        { label: { langKey: '1 minute' }, value: 60 },
        { label: { langKey: '2 minutes' }, value: 120 },
        { label: { langKey: '3 minutes' }, value: 180 },
        { label: { langKey: '4 minutes' }, value: 240 },
        { label: { langKey: '5 minutes' }, value: 300 },
        { label: { langKey: '10 minutes' }, value: 600 },
        { label: { langKey: '15 minutes' }, value: 900 },
        { label: { langKey: '30 minutes' }, value: 1800 },
        { label: { langKey: '45 minutes' }, value: 2700 },
        { label: { langKey: '1 hour' }, value: 3600 },
        { label: { langKey: '1.5 hours' }, value: 5400 },
        { label: { langKey: '2 hours' }, value: 7200 },
        { label: { langKey: '3 hours' }, value: 10800 },
        { label: { langKey: '4 hours' }, value: 14400 },
        { label: { langKey: '5 hours' }, value: 18000 },
        { label: { langKey: '6 hours' }, value: 21600 },
        { label: { langKey: '9 hours' }, value: 32400 },
        { label: { langKey: '12 hours' }, value: 43200 },
        { label: { langKey: '16 hours' }, value: 57600 },
        { label: { langKey: '20 hours' }, value: 72000 },
        { label: { langKey: '23 hours' }, value: 82800 },
        { label: { langKey: '24 hours (1 day)' }, value: 86400 },
        { label: { langKey: '25 hours' }, value: 90000 },
        { label: { langKey: '26 hours' }, value: 93600 },
        { label: { langKey: '36 hours (1.5 days)' }, value: 129600 },
        { label: { langKey: '2 days' }, value: 172800 },
        { label: { langKey: '3 days' }, value: 259200 },
        { label: { langKey: '4 days' }, value: 345600 },
        { label: { langKey: '5 days' }, value: 432000 },
        { label: { langKey: '6 days' }, value: 518400 },
        { label: { langKey: '1 week' }, value: 604800 },
        { label: { langKey: '2 week' }, value: 1209600 },
        { label: { langKey: '3 week' }, value: 1814400 },
        { label: { langKey: '1 month' }, value: 2419200 },
        { label: { langKey: '2 months' }, value: 4838400 },
        { label: { langKey: '3 months' }, value: 7257600 },
        { label: { langKey: '4 months' }, value: 9676800 },
        { label: { langKey: '5 months' }, value: 12096000 },
        { label: { langKey: '6 months' }, value: 14515200 },
        { label: { langKey: '9 months' }, value: 21772800 },
        { label: { langKey: '1 year' }, value: 29030400 },
      ],
      category: 'security',
      description: {
        langKey:
          'How long is the maximum session age. If "Rolling session" is set ON, then this is the idle time. Editing this setting will restart the app.',
      },
    },
    label: { langKey: 'Session Max Age' },
  },
  {
    elemId: 'sessionIsRolling',
    elemType: 'inputCheckbox',
    valueType: 'boolean',
    elemData: {
      defaultValue: CONFIG?.security?.sessionIsRolling === true,
      category: 'security',
      description: {
        langKey:
          'Whether the session type is "Rolling" or not. When "Rolling" is turned on, it means that the session expiration time is reset on every session check / api call. It also means that the session is saved to the sessionStore all the time (more calls). Editing this setting will restart the app.',
      },
    },
    label: { langKey: 'Use Rolling Session' },
  },
  {
    elemId: 'maxLoginAttempts',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.maxLoginAttempts >= 1
          ? Math.round(Number(CONFIG.security.maxLoginAttempts))
          : 4,
      minValue: 1,
      precision: 0,
      step: 1,
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'How many failed login attempts can a user make before their account goes under cooldown.',
      },
    },
    label: { langKey: 'Max Login Attempts' },
  },
  {
    elemId: 'coolDownAge',
    elemType: 'inputDropDown',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.coolDownAge >= 30 ? Math.round(Number(CONFIG.security.coolDownAge)) : 240,
      options: [
        { label: { langKey: '30 seconds' }, value: 30 },
        { label: { langKey: '1 minute' }, value: 60 },
        { label: { langKey: '2 minutes' }, value: 120 },
        { label: { langKey: '3 minutes' }, value: 180 },
        { label: { langKey: '4 minutes' }, value: 240 },
        { label: { langKey: '5 minutes' }, value: 300 },
        { label: { langKey: '10 minutes' }, value: 600 },
        { label: { langKey: '15 minutes' }, value: 900 },
        { label: { langKey: '30 minutes' }, value: 1800 },
        { label: { langKey: '45 minutes' }, value: 2700 },
        { label: { langKey: '1 hour' }, value: 3600 },
        { label: { langKey: '1.5 hours' }, value: 5400 },
        { label: { langKey: '2 hours' }, value: 7200 },
        { label: { langKey: '3 hours' }, value: 10800 },
        { label: { langKey: '4 hours' }, value: 14400 },
        { label: { langKey: '5 hours' }, value: 18000 },
        { label: { langKey: '6 hours' }, value: 21600 },
        { label: { langKey: '9 hours' }, value: 32400 },
        { label: { langKey: '12 hours' }, value: 43200 },
        { label: { langKey: '16 hours' }, value: 57600 },
        { label: { langKey: '20 hours' }, value: 72000 },
        { label: { langKey: '23 hours' }, value: 82800 },
        { label: { langKey: '24 hours (1 day)' }, value: 86400 },
      ],
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'How long must the user cooldown after Max login attempts are used (failed login attempts).',
      },
    },
    label: { langKey: 'Cooldown Time After Max Login Attempts' },
  },
  {
    elemId: 'maxLoginLogs',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.maxLoginLogs >= 0 ? Math.round(Number(CONFIG.security.maxLoginLogs)) : 5,
      minValue: 0,
      precision: 0,
      step: 1,
      category: 'security',
      description: {
        langKey: 'How many successfull logins are logged. 0 is infinite.',
      },
    },
    label: { langKey: 'Max Successfull Login Logs Count' },
  },
  {
    elemId: 'maxLoginAttemptLogs',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.maxLoginAttemptLogs >= 0
          ? Math.round(Number(CONFIG.security.maxLoginAttemptLogs))
          : 5,
      minValue: 0,
      precision: 0,
      step: 1,
      category: 'security',
      description: {
        langKey: 'How many failed logins are logged. 0 is infinite.',
      },
    },
    label: { langKey: 'Max Failed Login Logs Count' },
  },
  {
    elemId: 'defaultEditedLogs',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.defaultEditedLogs >= 0
          ? Math.round(Number(CONFIG.security.defaultEditedLogs))
          : 5,
      minValue: 0,
      precision: 0,
      step: 1,
      category: 'security',
      description: {
        langKey:
          'How many edited history log items are saved to a document as default. This number can be overridden, if a form has a "editedHistoryCount" defined.',
      },
    },
    label: { langKey: 'Default Edited History Log Items Count' },
  },
  {
    elemId: 'use2FA',
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: [
        'DISABLED',
        'ENABLED',
        'USER_CHOOSES',
        'USER_CHOOSES_AND_SET_TO_DISABLED',
        'USER_CHOOSES_AND_SET_TO_ENABLED',
      ].includes(CONFIG?.security?.use2FA)
        ? CONFIG.security.use2FA
        : 'DISABLED',
      options: [
        { label: { langKey: 'Disabled' }, value: 'DISABLED' },
        { label: { langKey: 'Enabled' }, value: 'ENABLED' },
        { label: { langKey: 'User chooses' }, value: 'USER_CHOOSES' },
        {
          label: { langKey: 'User chooses, set to disabled for all' },
          value: 'USER_CHOOSES_AND_SET_TO_DISABLED',
        },
        {
          label: { langKey: 'User chooses, set to enabled for all' },
          value: 'USER_CHOOSES_AND_SET_TO_ENABLED',
        },
      ],
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'Whether to enable two-factor authentication for all users or not, or whether the users can choose to enable 2FA for themselves. Requires that the setting "Email enabled" is turned ON and all email settings are configured correctly.',
      },
    },
    label: { langKey: 'Use Two-Factor Authentication (2FA)' },
  },
  {
    elemId: 'twoFASessionAgeInMin',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.twoFASessionAgeInMin >= 0
          ? Number(CONFIG.security.twoFASessionAgeInMin)
          : 30,
      minValue: 0.5,
      unit: { single: { langKey: 'minute' }, multi: { langKey: 'minutes' } },
      category: 'security',
      description: {
        langKey:
          'How long is the two-factor authentication session in minutes. This is the time the 2FA code is valid. Requires that the setting "Email enabled" is turned ON and all email settings are configured correctly.',
      },
    },
    label: { langKey: 'Two-Factor Authentication (2FA) Code Expiration Time' },
  },
  {
    elemId: 'loginMethod',
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: [
        'USERNAME_ONLY',
        'EMAIL_ONLY',
        'USER_CHOOSES_USERNAME_AS_DEFAULT',
        'USER_CHOOSES_EMAIL_AS_DEFAULT',
      ].includes(CONFIG?.security?.loginMethod)
        ? CONFIG.security.loginMethod
        : 'USERNAME_ONLY',
      options: [
        { label: { langKey: 'Username only' }, value: 'USERNAME_ONLY' },
        { label: { langKey: 'Email only' }, value: 'EMAIL_ONLY' },
        {
          label: { langKey: 'User chooses, Username as default' },
          value: 'USER_CHOOSES_USERNAME_AS_DEFAULT',
        },
        {
          label: { langKey: 'User chooses, Email as default' },
          value: 'USER_CHOOSES_EMAIL_AS_DEFAULT',
        },
      ],
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'Whether users are required to login with a Username or Email, or if they can choose the option',
      },
    },
    label: { langKey: 'Login with Username, Email, or Both' },
  },
  {
    elemId: 'forgotPassIdMethod',
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: ['DISABLED', 'EMAIL_ONLY', 'USERNAME_ONLY', 'EITHER', 'BOTH_REQUIRED'].includes(
        CONFIG?.security?.forgotPassIdMethod
      )
        ? CONFIG.security.forgotPassIdMethod
        : 'USERNAME_ONLY',
      options: [
        { label: { langKey: 'Forgot password is disabled' }, value: 'DISABLED' },
        { label: { langKey: 'Email only' }, value: 'EMAIL_ONLY' },
        { label: { langKey: 'Username only' }, value: 'USERNAME_ONLY' },
        { label: { langKey: 'Either username or email' }, value: 'EITHER' },
        { label: { langKey: 'Username and email required' }, value: 'BOTH_REQUIRED' },
      ],
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'How are the users required to identify when requiring a forgotten / new password.',
      },
    },
    label: { langKey: 'Forgot Password Identification Method' },
  },
  {
    elemId: 'forgotPassSessionAgeInMin',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.security?.forgotPassSessionAgeInMin >= 0
          ? Number(CONFIG.security.forgotPassSessionAgeInMin)
          : 30,
      minValue: 0.5,
      unit: { single: { langKey: 'minute' }, multi: { langKey: 'minutes' } },
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'How long is the forgot password session in minutes. This is the time the forgot password link is valid. Requires that the setting "Forgot password identification method" is not "disabled" and all email settings are configured correctly.',
      },
    },
    label: { langKey: 'Forgot Password Link Expiration Time' },
  },
  {
    elemId: 'allowedHostNames',
    elemType: 'inputText',
    valueType: 'string',
    elemData: {
      defaultValue: process.env.CLIENT_HOST_NAMES || '',
      category: 'security',
      description: {
        langKey:
          'Allowed host names list, separated by a comma (spaces after the comma are ignored). For example: "https://www.example1.com, http://www.example2.com". There could be other allowed URLs which are defined in the environment variables.',
      },
    },
    label: { langKey: 'Allowed Host Names' },
  },
  // security CATEGORY [/END]

  // data CATEGORY [START]
  {
    elemId: 'dataItemsMaxLimit',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.data?.dataItemsMaxLimit >= 1
          ? Math.round(Number(CONFIG.data.dataItemsMaxLimit))
          : 500,
      minValue: 1,
      precision: 0,
      step: 1,
      category: 'data',
      publicSetting: true,
      description: {
        langKey: 'Listed data items max limit per page.',
      },
    },
    label: { langKey: 'Data Items Max Limit' },
  },
  {
    elemId: 'dataCollationLocale',
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: CONFIG?.data?.dataCollationLocale || 'en',
      options: [
        { label: { langKey: 'English' }, value: 'en' },
        { label: { langKey: 'English (United States)' }, value: 'en_US' },
        { label: { langKey: 'English (United States, Computer)' }, value: 'en_US_POSIX' },
        { label: { langKey: 'Finnish' }, value: 'fi' },
        { label: { langKey: 'French' }, value: 'fr' },
        { label: { langKey: 'German' }, value: 'de' },
        { label: { langKey: 'Greek' }, value: 'el' },
        { label: { langKey: 'Italian' }, value: 'it' },
        { label: { langKey: 'Polish' }, value: 'pl' },
        { label: { langKey: 'Portuguese' }, value: 'pt' },
        { label: { langKey: 'Spanish' }, value: 'es' },
        { label: { langKey: 'Swedish' }, value: 'sv' },
        { label: { langKey: 'Ukrainian' }, value: 'uk' },
      ],
      category: 'data',
      publicSetting: true,
      description: {
        langKey: 'Listed data items max limit.',
      },
    },
    label: { langKey: 'Data Collation Locale' },
  },
  // data CATEGORY [/END]

  // caches CATEGORY [START]
  {
    elemId: 'userGroupsCacheTime',
    elemType: 'inputDropDown',
    valueType: 'number',
    elemData: {
      defaultValue:
        CONFIG?.caches?.userGroupsCacheTime >= 30
          ? Math.round(Number(CONFIG.caches.userGroupsCacheTime))
          : 180,
      options: [
        { label: { langKey: '30 seconds' }, value: 30 },
        { label: { langKey: '1 minute' }, value: 60 },
        { label: { langKey: '2 minutes' }, value: 120 },
        { label: { langKey: '3 minutes' }, value: 180 },
        { label: { langKey: '4 minutes' }, value: 240 },
        { label: { langKey: '5 minutes' }, value: 300 },
        { label: { langKey: '10 minutes' }, value: 600 },
        { label: { langKey: '15 minutes' }, value: 900 },
        { label: { langKey: '30 minutes' }, value: 1800 },
        { label: { langKey: '45 minutes' }, value: 2700 },
        { label: { langKey: '1 hour' }, value: 3600 },
        { label: { langKey: '1.5 hours' }, value: 5400 },
        { label: { langKey: '2 hours' }, value: 7200 },
        { label: { langKey: '3 hours' }, value: 10800 },
        { label: { langKey: '4 hours' }, value: 14400 },
        { label: { langKey: '5 hours' }, value: 18000 },
        { label: { langKey: '6 hours' }, value: 21600 },
        { label: { langKey: '9 hours' }, value: 32400 },
        { label: { langKey: '12 hours' }, value: 43200 },
        { label: { langKey: '16 hours' }, value: 57600 },
        { label: { langKey: '20 hours' }, value: 72000 },
        { label: { langKey: '23 hours' }, value: 82800 },
        { label: { langKey: '24 hours (1 day)' }, value: 86400 },
      ],
      category: 'caches',
      description: {
        langKey:
          "How long is the cache time for user groups on the user's session. If a user is added/removed to/from a group, it will take this amount of time before the session registers it. Logging out and in again will reset cache.",
      },
    },
    label: { langKey: 'User Groups Session Cache Time' },
  },
  // caches CATEGORY [/END]

  // email CATEGORY [START]
  {
    elemId: 'useEmail',
    elemType: 'inputCheckbox',
    valueType: 'boolean',
    elemData: {
      defaultValue: process.env.EMAIL_ENABLED === 'true',
      category: 'email',
      publicSetting: true,
      description: {
        langKey:
          'Whether to enable email sending or not. Requires that the email host, user, pass, and port are configured properly.',
      },
    },
    label: { langKey: 'Use Email Service' },
  },
  {
    elemId: 'emailHost',
    elemType: 'inputText',
    valueType: 'string',
    elemData: {
      defaultValue: process.env.EMAIL_HOST || '',
      category: 'email',
      description: {
        langKey: 'Email SMTP host name.',
      },
    },
    label: { langKey: 'Email Host' },
  },
  {
    elemId: 'emailUser',
    elemType: 'inputText',
    valueType: 'string',
    elemData: {
      defaultValue: process.env.EMAIL_USER || '',
      category: 'email',
      description: {
        langKey: 'Email SMTP user / username. Usually it is the email address.',
      },
    },
    label: { langKey: 'Email Username' },
  },
  {
    elemId: 'emailPass',
    elemType: 'inputSecret',
    valueType: 'string',
    elemData: {
      defaultValue: process.env.EMAIL_PASS || '',
      category: 'email',
      password: true,
      description: {
        langKey: 'Email SMTP password. This is stored as an encrypted value in the database.',
      },
    },
    label: { langKey: 'Email Password' },
  },
  {
    elemId: 'emailPort',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: 587,
      precision: 0,
      step: 1,
      category: 'email',
      description: {
        langKey: 'Email SMTP port number.',
      },
    },
    label: { langKey: 'Email Port' },
  },
  {
    elemId: 'forceEmailVerification',
    elemType: 'inputCheckbox',
    valueType: 'boolean',
    elemData: {
      defaultValue: CONFIG?.email?.forceEmailVerification === true,
      category: 'email',
      description: {
        langKey:
          'Whether or not the users are forced to verify their primary email addresses. Requires that the setting "Email enabled" is turned ON and all email settings are configured correctly.',
      },
    },
    label: { langKey: 'Force Email Verification' },
  },
  {
    elemId: 'maxEmails',
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: CONFIG?.email?.maxEmails >= 1 ? Math.round(Number(CONFIG.email.maxEmails)) : 2,
      minValue: 1,
      precision: 0,
      step: 1,
      category: 'email',
      publicSetting: true,
      description: {
        langKey: 'Maximum emails a user can have.',
      },
    },
    label: { langKey: 'Max Emails per User' },
  },
  // email CATEGORY [/END]

  // appGeneral CATEGORY [START]
  {
    elemId: 'appName',
    elemType: 'inputText',
    valueType: 'string',
    elemData: {
      defaultValue: CONFIG?.appGeneral?.appName || 'Council',
      category: 'appGeneral',
      publicSetting: true,
      description: {
        langKey: 'Application name to be shown in different places (eg. emails and page titles).',
      },
    },
    label: { langKey: 'Application Name' },
  },
  {
    elemId: 'defaultLang',
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: CONFIG?.appGeneral?.appName || 'en',
      options: [
        // ISO 639-1 Language Codes: https://www.w3schools.com/tags/ref_language_codes.asp
        { label: { langKey: 'English' }, value: 'en' },
        { label: { langKey: 'Finnish' }, value: 'fi' },
      ],
      category: 'appGeneral',
      description: {
        langKey:
          "Application's default language. This applies for users that haven't selected a language.",
      },
    },
    label: { langKey: 'Default Language' },
  },
  // appGeneral CATEGORY [/END]
];

export default systemSettingsFormElems;

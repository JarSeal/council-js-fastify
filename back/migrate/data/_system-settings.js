const config = require('../../../CONFIG.json');

const systemSettingsFormElems = [
  // security CATEGORY [START]
  {
    elemId: 'sessionMaxAge',
    orderNr: 1,
    elemType: 'inputDropDown',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.sessionMaxAge || 3600,
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
          'How long is the maximum session age (idle age). Editing this setting will restart the app.',
      },
    },
    label: { langKey: 'Session max age' },
  },
  {
    elemId: 'sessionIsRolling',
    orderNr: 2,
    elemType: 'inputCheckbox',
    valueType: 'boolean',
    elemData: {
      defaultValue: config?.security?.sessionIsRolling || true,
      category: 'security',
      description: {
        langKey:
          'Whether the session type is "Rolling" or not. When "Rolling" is turned on, it means that the session expiration time is reset on every session check / api call. It also means that the session is saved to the sessionStore all the time (more calls). Editing this setting will restart the app.',
      },
    },
    label: { langKey: 'Rolling Session' },
  },
  {
    elemId: 'maxLoginAttempts',
    orderNr: 3,
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.maxLoginAttempts || 4,
      minValue: 1,
      category: 'security',
      publicSetting: true,
      description: {
        langKey:
          'How many failed login attempts can a user make before their account goes under cooldown.',
      },
    },
    label: { langKey: 'Max login attempts' },
  },
  {
    elemId: 'coolDownAge',
    orderNr: 4,
    elemType: 'inputDropDown',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.coolDownAge || 240,
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
    label: { langKey: 'Cooldown time after max login attempts' },
  },
  {
    elemId: 'maxLoginLogs',
    orderNr: 5,
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.maxLoginLogs || 5,
      minValue: 0,
      category: 'security',
      description: {
        langKey: 'How many successfull logins are logged. 0 is infinite.',
      },
    },
    label: { langKey: 'Max successfull login logs count' },
  },
  {
    elemId: 'maxLoginAttemptLogs',
    orderNr: 6,
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.maxLoginAttemptLogs || 5,
      minValue: 0,
      category: 'security',
      description: {
        langKey: 'How many failed logins are logged. 0 is infinite.',
      },
    },
    label: { langKey: 'Max failed login logs count' },
  },
  {
    elemId: 'forceEmailVerification',
    orderNr: 7,
    elemType: 'inputCheckbox',
    valueType: 'boolean',
    elemData: {
      defaultValue: config?.security?.forceEmailVerification || false,
      category: 'security',
      description: {
        langKey: 'Whether or not the users are forced to verify their primary email addresses.',
      },
    },
    label: { langKey: 'Force Email Verification' },
  },
  {
    elemId: 'maxEmails',
    orderNr: 8,
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.maxEmails || 2,
      minValue: 1,
      category: 'security',
      publicSetting: true,
      description: {
        langKey: 'Maximum emails a user can have. Minimum is 1.',
      },
    },
    label: { langKey: 'Max emails per user' },
  },
  {
    elemId: 'use2FA',
    orderNr: 9,
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: config?.security?.use2FA || 'DISABLED',
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
          'Whether to enable 2-factor authentication for all users or not, or whether the users can choose to enable 2FA for themselves.',
      },
    },
    label: { langKey: 'Use 2-factor authentication' },
  },
  {
    elemId: 'loginMethod',
    orderNr: 10,
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: config?.security?.loginMethod || 'USERNAME_ONLY',
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
    elemId: 'allowedHostNames',
    orderNr: 11,
    elemType: 'inputText',
    valueType: 'string',
    elemData: {
      defaultValue: '',
      category: 'security',
      description: {
        langKey:
          'Allowed host names list, separated by a comma (spaces after the comma are ignored). For example: "https://www.example1.com, http://www.example2.com". There could be other allowed URLs which are defined in the environment variables.',
      },
    },
    label: { langKey: 'Max emails per user' },
  },
  {
    elemId: 'defaultEditedLogs',
    orderNr: 12,
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.defaultEditedLogs || 5,
      minValue: 0,
      category: 'security',
      description: {
        langKey:
          'How many edited history log items are saved to a document as default. This number can be overridden, if a form has a "editedHistoryCount" defined.',
      },
    },
    label: { langKey: 'Default Edited History Log Items Count' },
  },
  // security CATEGORY [END]

  // data CATEGORY [START]
  {
    elemId: 'dataItemsMaxLimit',
    orderNr: 13,
    elemType: 'inputNumber',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.dataItemsMaxLimit || 500,
      minValue: 1,
      category: 'data',
      publicSetting: true,
      description: {
        langKey: 'Listed data items max limit.',
      },
    },
    label: { langKey: 'Data Items Max Limit' },
  },
  {
    elemId: 'dataCollationLocale',
    orderNr: 14,
    elemType: 'inputDropDown',
    valueType: 'string',
    elemData: {
      defaultValue: config?.security?.dataCollationLocale || 'en',
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
    label: { langKey: 'Data Items Max Limit' },
  },
  // data CATEGORY [END]

  // caches CATEGORY [START]
  {
    elemId: 'userGroupsCacheTime',
    orderNr: 15,
    elemType: 'inputDropDown',
    valueType: 'number',
    elemData: {
      defaultValue: config?.security?.userGroupsCacheTime || 180,
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
  // caches CATEGORY [END]
];

module.exports = systemSettingsFormElems;

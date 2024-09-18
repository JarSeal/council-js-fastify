export default {
  appGeneral: {
    appName: 'Council',
    defaultLang: 'en',
    languages: {
      en: { shortName: 'Eng', name: 'English' },
      fi: { shortName: 'Fin', name: 'Finnish' },
    },
  },
  security: {
    sessionMaxAge: 3600,
    sessionIsRolling: true,
    maxLoginAttempts: 4,
    coolDownAge: 240,
    maxLoginLogs: 5,
    maxLoginAttemptLogs: 5,
    defaultEditedLogs: 10,
    use2FA: 'DISABLED',
    twoFASessionAgeInMin: 30,
    loginMethod: 'USER_CHOOSES_USERNAME_AS_DEFAULT',
    forgotPassIdMethod: 'EITHER',
    forgotPassSessionAgeInMin: 30,
  },
  data: {
    dataItemsMaxLimit: 500,
    dataCollationLocale: 'fi',
  },
  caches: {
    userGroupsCacheTime: 180,
  },
  email: {
    forceEmailVerification: false,
    maxEmails: 2,
  },
};

module.exports = [
  {
    simpleId: 'sysLoginPath',
    path: '/sys/login',
    name: 'System Login Path',
    description: 'Council system login view path for signing in.',
    privileges: { public: 'true' },
    componentId: 'sysLoginView',
  },
  {
    simpleId: 'newPassRequestPath',
    path: '/sys/new-pass-request',
    name: 'New Pass Request Path',
    description: 'New user password request view path.',
    privileges: { public: 'true' },
    componentId: 'newPassRequestView',
  },
  {
    simpleId: 'newPassPath',
    path: '/sys/new-pass',
    name: 'New Password',
    description: 'New user password creation view path.',
    privileges: { public: 'true' },
    componentId: 'newPassView',
  },
  {
    simpleId: 'verifyEmailPath',
    path: '/sys/verify-email',
    name: 'Verify Email Path',
    description: 'Verify user email view path.',
    privileges: { public: 'true' },
    componentId: 'verifyEmailView',
  },
  // User data
  // System home
  //
];

module.exports = [
  {
    simpleId: 'sysLoginPath',
    path: '/sys/login',
    systemDocument: true,
    name: 'System Login Path',
    description: 'Council system login path for signing in.',
    privileges: { public: 'true' },
    componentId: 'sysLoginView',
  },
];

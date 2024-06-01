module.exports = [
  // public
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
  {
    simpleId: 'publicSignUpPath',
    path: '/public-sign-up',
    name: 'Public Sign Up Path',
    description: 'Sign up or register a new user view path.',
    privileges: { public: 'true' },
    componentId: 'publicSignUpView',
  },

  // signed in views, user related
  {
    simpleId: 'sysHomePath',
    path: '/sys',
    name: 'System Home Path',
    description: 'Council system home view path.',
    privileges: { public: 'false' },
    componentId: 'sysHomeView',
  },
  {
    simpleId: 'myAccountPath',
    path: '/my-account',
    name: 'My Account Path',
    description:
      'My account (current signed in user) view path. This view shows the Council account information such as username, emails, and usage data. In this view the user can also delete the account.',
    privileges: { public: 'false' },
    componentId: 'myAccountView',
  },
  {
    simpleId: 'myProfilePath',
    path: '/my-profile',
    name: 'My Profile Path',
    description:
      'My profile (current signed in user) view path. This view shows the customizable user information. By default it is the optional description of the user but it can be exteded with the user data model.',
    privileges: { public: 'false' },
    componentId: 'myProfileView',
  },
  {
    simpleId: 'mySettingsPath',
    path: '/my-settings',
    name: 'My settings path',
    description:
      'My settings (current signed in user) view path. This shows available settings to edit for the user.',
    privileges: { public: 'false' },
    componentId: 'mySettingsView',
  },

  // user management
  {
    simpleId: 'usersListPath',
    path: '/sys/users-list',
    name: 'Users List Path',
    description: 'This view shows all the users that the current viewer can see.',
    privileges: { public: 'false' },
    componentId: 'usersListView',
  },
  {
    simpleId: 'userViewPath',
    path: '/user/:usernameOrId',
    name: 'User View Path',
    description:
      'This view shows the user data to the current (maybe and usually a privileged) user.',
    privileges: { public: 'false' },
    componentId: 'userView',
  },
  {
    simpleId: 'editUserViewPath',
    path: '/sys/edit-user/:usernameOrId',
    name: 'Edit User View Path',
    description:
      'This view is the form to edit a user (the editor must have privileges to edit the user).',
    privileges: { public: 'false' },
    componentId: 'editUserView',
  },
  {
    simpleId: 'createUserPath',
    path: '/sys/create-user',
    name: 'Create User Path',
    description:
      'This view is for creating user. This means that the creator will be an admin for the user.',
    privileges: { public: 'false' },
    componentId: 'createUserView',
  },

  // group management
  {
    simpleId: 'groupsListPath',
    path: '/sys/groups-list',
    name: 'Groups List Path',
    description: 'This view shows all the groups that the current viewer can see.',
    privileges: { public: 'false' },
    componentId: 'groupsListView',
  },
  {
    simpleId: 'groupViewPath',
    path: '/sys/group/:groupNameOrId',
    name: 'Group View Path',
    description:
      'This view shows the group data to the current (maybe and usually a privileged) user.',
    privileges: { public: 'false' },
    componentId: 'groupView',
  },
  {
    simpleId: 'editGroupViewPath',
    path: '/sys/edit-group/:groupNameOrId',
    name: 'Edit Group View Path',
    description:
      'This view is the form to edit a group (the editor must have privileges to edit the user).',
    privileges: { public: 'false' },
    componentId: 'editGroupView',
  },
  {
    simpleId: 'createGroupPath',
    path: '/sys/create-group',
    name: 'Create Group Path',
    description:
      'This view is for creating group. This means that the creator will be an admin for the group.',
    privileges: { public: 'false' },
    componentId: 'createGroupView',
  },

  // form management
  {
    simpleId: 'formsListPath',
    path: '/sys/forms-list',
    name: 'Forms List Path',
    description: 'Forms list view path.',
    privileges: { public: 'false' },
    componentId: 'formsListView',
  },
  {
    simpleId: 'formViewPath',
    path: '/sys/:formId',
    name: 'Form View Path',
    description: 'View one form view path.',
    privileges: { public: 'false' },
    componentId: 'formView',
  },
  {
    simpleId: 'editFormPath',
    path: '/sys/edit-form/:formId',
    name: 'Edit Form View Path',
    description: 'Edit one form view path.',
    privileges: { public: 'false' },
    componentId: 'editFormView',
  },

  // formData management
  {
    simpleId: 'formDataListPath',
    path: '/sys/form-data-list',
    name: 'Form Data List Path',
    description: 'Form data list view path.',
    privileges: { public: 'false' },
    componentId: 'formDataListView',
  },
  {
    simpleId: 'formViewPath',
    path: '/sys/:formId',
    name: 'Form Data Item View Path',
    description: 'View one form data item view path.',
    privileges: { public: 'false' },
    componentId: 'formDataView',
  },
  {
    simpleId: 'editFormDataPath',
    path: '/sys/edit-form-data/:formDataId',
    name: 'Edit Form Data Item View Path',
    description: 'Edit one form data item view path.',
    privileges: { public: 'false' },
    componentId: 'editFormDataView',
  },

  // privilege management
  {
    simpleId: 'privilegeListPath',
    path: '/sys/privilege-list',
    name: 'Privileges List Path',
    description: 'Privileges list view path.',
    privileges: { public: 'false' },
    componentId: 'privilegesListView',
  },
  {
    simpleId: 'privilegeViewPath',
    path: '/sys/:formId',
    name: 'Privilege View Path',
    description: 'View one privilege view path.',
    privileges: { public: 'false' },
    componentId: 'privilegeView',
  },
  {
    simpleId: 'editPrivilegePath',
    path: '/sys/edit-privilege/:privilegeId',
    name: 'Edit Privilege View Path',
    description: 'Edit one privilege view path.',
    privileges: { public: 'false' },
    componentId: 'editPrivilegeView',
  },

  // clientRoute management
  {
    simpleId: 'clientRoutesListPath',
    path: '/sys/client-routes-list',
    name: 'Client Routes List Path',
    description: 'Client routes list view path.',
    privileges: { public: 'false' },
    componentId: 'clientRoutesListView',
  },
  {
    simpleId: 'clientRouteViewPath',
    path: '/sys/:clientRouteId',
    name: 'Client Route View Path',
    description: 'View one client route view path.',
    privileges: { public: 'false' },
    componentId: 'clientRouteView',
  },
  {
    simpleId: 'editClientRoutePath',
    path: '/sys/edit-client-route/:clientRouteId',
    name: 'Edit Client Route View Path',
    description: 'Edit one client route view path.',
    privileges: { public: 'false' },
    componentId: 'editClientRouteView',
  },

  // email management
  {
    simpleId: 'emailsListPath',
    path: '/sys/emails-list',
    name: 'Emails List Path',
    description: 'Emails list view path.',
    privileges: { public: 'false' },
    componentId: 'emailsListView',
  },
  {
    simpleId: 'emailViewPath',
    path: '/sys/:emailId',
    name: 'Email View Path',
    description: 'View one email view path.',
    privileges: { public: 'false' },
    componentId: 'emailView',
  },
  {
    simpleId: 'editEmailPath',
    path: '/sys/edit-email/:emailId',
    name: 'Edit Email View Path',
    description: 'Edit one email view path.',
    privileges: { public: 'false' },
    componentId: 'editEmailView',
  },

  // system admins
  {
    simpleId: 'sysSettingsPath',
    path: '/sys/settings',
    name: 'System Settings Path',
    description: 'Council system settings view path.',
    privileges: { public: 'false' },
    componentId: 'sysSettingsView',
  },
  {
    simpleId: 'editSysSettingPath',
    path: '/sys/edit-setting',
    name: 'Edit System Setting Path',
    description: 'Council edit system setting view path (one setting).',
    privileges: { public: 'false' },
    componentId: 'editSysSettingView',
  },
  {
    simpleId: 'sysMonitorPath',
    path: '/sys/monitor',
    name: 'System Monitor Path',
    description: 'Council system monitor view path.',
    privileges: { public: 'false' },
    componentId: 'sysMonitorView',
  },
];

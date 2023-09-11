const {
  getSuperAdminUsername,
  getSuperAdminPassword,
  getSuperAdminEmail,
} = require('../data/utils');

module.exports = {
  async up(db) {
    const timeNow = new Date();

    await db.collection('users').insertOne({
      simpleId: getSuperAdminUsername(),
      emails: [
        {
          email: getSuperAdminEmail(),
          verified: true,
          added: timeNow,
        },
      ],
      passwordHash: getSuperAdminPassword(),
      created: {
        user: null,
        publicForm: false,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      security: {
        forcePassChange: false,
        loginAttempts: 0,
        coolDownStarted: null,
        isUnderCoolDown: false,
        lastLoginAttempts: [],
        lastLogins: [],
      },
    });
  },

  async down(db) {
    await db.collection('users').deleteOne({ simpleId: getSuperAdminUsername() });
  },
};

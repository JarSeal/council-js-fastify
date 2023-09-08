const { hash } = require('bcrypt');
const { config } = require('dotenv');

config({ path: '../.env' });

const defaultUsername = 'superadmin';
const defaultEmail = 'notreal@notarealdomain.com';
const defaultPassword = 'changepassword';

module.exports = {
  async up(db) {
    const username = process.env.SUPER_ADMIN_USERNAME || defaultUsername;
    const email = process.env.SUPER_ADMIN_EMAIL || defaultEmail;
    const password = process.env.SUPER_ADMIN_PASS || defaultPassword;
    const passwordHash = await hash(password, Number(process.env.SALT_ROUNDS || 10));

    const timeNow = new Date();

    await db.collection('users').insertOne({
      simpleId: username,
      emails: [
        {
          email,
          verified: true,
          added: timeNow,
        },
      ],
      passwordHash,
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
    await db
      .collection('users')
      .deleteOne({ simpleId: process.env.SUPER_ADMIN_USERNAME || defaultUsername });
  },
};

const { config } = require('dotenv');
const { hash } = require('bcrypt');
const { createUrlTokenAndId } = require('../../dist/back/src/utils/token');
const { default: DBUserModel } = require('../../dist/back/src/dbModels/user.js');

config();

const userCount = 100;
const usernameBase = 'testuser';
const password = 'password';

const createUsers = async () => {
  console.log('\nCreate users...');
  let removedPreviousUsersMsg = '';
  let removedCount = 0;
  for (let i = 0; i < userCount; i++) {
    const dateNow = new Date();
    const simpleId = usernameBase + i;
    const foundUser = await DBUserModel.find({ simpleId });
    if (foundUser) {
      await DBUserModel.deleteOne({ simpleId });
      removedCount++;
    }
    const isVerified = i + 1 > 100 / 2;
    let token = null;
    let tokenId = null;
    if (!isVerified) {
      const tokenAndId = await createUrlTokenAndId('EMAIL_VERIFICATION');
      token = tokenAndId.token;
      tokenId = tokenAndId.tokenId;
    }
    const passwordHash = await hash(password, Number(process.env.SALT_ROUNDS || 10));
    const newUser = new DBUserModel({
      simpleId,
      emails: [
        {
          email: simpleId + '@council.fastify',
          verified: isVerified,
          token: {
            token,
            tokenId,
          },
          added: dateNow,
        },
      ],
      passwordHash,
      created: { user: null, publicForm: true, date: dateNow },
      edited: [],
      systemDocument: false,
      security: {
        forcePassChange: i === 0,
        loginAttempts: 0,
        coolDownStarted: null,
        isUnderCoolDown: false,
        lastLoginAttempts: [],
        lastLogins: [],
      },
    });
    await newUser.save();
  }

  if (removedCount > 0) {
    removedPreviousUsersMsg = ` (removed ${removedCount} previously created seed data users)`;
  }
  console.log(`Created ${userCount} seed data users${removedPreviousUsersMsg}.`);
  console.log('- Username: ' + usernameBase + '0-' + (userCount - 1));
  console.log('- Password: ' + password);
  console.log('- Email: ' + usernameBase + '0-' + (userCount - 1) + '@council.fastify');
};

module.exports = { createUsers };

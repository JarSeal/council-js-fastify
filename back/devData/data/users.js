const { config } = require('dotenv');
const { hash } = require('bcrypt');
const { createUrlTokenAndId } = require('../../dist/back/src/utils/token');
const { userCount, password, createUsername, createEmail, createGroupId } = require('./_config');
const { default: DBUserModel } = require('../../dist/back/src/dbModels/user');
const { default: DBGroupModel } = require('../../dist/back/src/dbModels/group');

config();

const extraUserCount = 2;

const removeUsers = async () => {
  console.log('\nUSERS:');
  console.log('Check and remove users...');
  const simpleIds = [];
  for (let i = 0; i < userCount + extraUserCount; i++) {
    const username = createUsername(i);
    simpleIds.push(username);

    // Remove all test users from groups
    const user = await DBUserModel.findOne({ simpleId: username });
    if (user?._id) {
      await DBGroupModel.updateMany({}, { $pull: { members: user._id } });
    }
  }
  // Delete all users
  const result = await DBUserModel.deleteMany({ simpleId: { $in: simpleIds } });
  console.log(`Removed ${result.deletedCount || 0} users.`);
};

const getUserObj = ({ i, isVerified, token, tokenId, dateNow, passwordHash }) => ({
  simpleId: createUsername(i),
  emails: [
    {
      email: createEmail(i),
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
    forcePassChange: i !== 0 && i === userCount - 1,
    loginAttempts: 0,
    coolDownStarted: null,
    isUnderCoolDown: false,
    lastLoginAttempts: [],
    lastLogins: [],
  },
});

const createUsers = async () => {
  if (userCount === 0) return;
  await removeUsers();
  console.log('Create users...');
  const users = [];
  const dateNow = new Date();
  const passwordHash = await hash(password, Number(process.env.SALT_ROUNDS || 10));
  const verifiedEmailsStart = 50;
  for (let i = 0; i < userCount; i++) {
    const isVerified = i + 1 > verifiedEmailsStart;
    let token = null;
    let tokenId = null;
    if (!isVerified) {
      const tokenAndId = await createUrlTokenAndId('EMAIL_VERIFICATION');
      token = tokenAndId.token;
      tokenId = tokenAndId.tokenId;
    }
    users.push(getUserObj({ i, isVerified, token, tokenId, dateNow, passwordHash }));
  }

  await DBUserModel.insertMany(users);

  // Create one basicUser and one sysAdmin user and add to respective groups
  const totalCount = userCount + extraUserCount;
  const basicUserObj = new DBUserModel(
    getUserObj({
      i: userCount,
      isVerified: true,
      token: null,
      tokenId: null,
      dateNow,
      passwordHash,
    })
  );
  const basicUser = await basicUserObj.save();
  await DBGroupModel.findOneAndUpdate(
    { simpleId: 'basicUsers' },
    { $addToSet: { members: basicUser._id } }
  );
  const adminUserObj = new DBUserModel(
    getUserObj({
      i: userCount + 1,
      isVerified: true,
      token: null,
      tokenId: null,
      dateNow,
      passwordHash,
    })
  );
  const adminUser = await adminUserObj.save();
  await DBGroupModel.findOneAndUpdate(
    { simpleId: 'sysAdmins' },
    { $addToSet: { members: adminUser._id } }
  );

  // Add testuser50 to testgroup0
  let userAddedToCustomGroupMsg = '';
  if (userCount > 50) {
    const user50username = createUsername(50);
    const user50 = await DBUserModel.findOne({ simpleId: user50username });
    const group0Id = createGroupId(0);
    await DBGroupModel.findOneAndUpdate(
      { simpleId: group0Id },
      { $addToSet: { members: user50._id } }
    );
    userAddedToCustomGroupMsg = ` Added "${user50username}" as a member to group "${group0Id}".`;
  }

  console.log(
    `Created ${totalCount} seed data users. Username "${createUsername(
      userCount
    )}" belongs to "basicUsers" group and username "${createUsername(
      userCount + 1
    )}" belongs to "sysAdmins" group. Users from 0 - ${
      verifiedEmailsStart - 1
    } have an unverified email.${userAddedToCustomGroupMsg}`
  );
  console.log(
    '- Usernames: ' +
      createUsername(0) +
      (totalCount > 1 ? ' - ' + createUsername(totalCount - 1) : '')
  );
  console.log('- Password: ' + password);
  console.log(
    '- Emails: ' + createEmail(0) + (totalCount > 1 ? ' - ' + createEmail(totalCount - 1) : '')
  );
};

module.exports = { createUsers, removeUsers };

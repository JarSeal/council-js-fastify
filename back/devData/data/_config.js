const { default: DBUserModel } = require('../../dist/back/src/dbModels/user');
const { getSuperAdminUsername } = require('../../migrate/data/utils');

const groupCount = 10;
const groupIdBase = 'testgroup';
const createGroupId = (i) => `${groupIdBase}${i}`;

const userCount = 100;
const usernameBase = 'testuser';
const password = 'password';
const createUsername = (i) => `${usernameBase}${i}`;
const createEmail = (i) => `${createUsername(i)}@council.fastify`;

let _superAdminId;
const getSuperAdminId = async () => {
  if (_superAdminId) return _superAdminId;
  const superAdmin = await DBUserModel.findOne({ simpleId: getSuperAdminUsername() });
  if (!superAdmin) {
    throw new Error('COULD NOT FIND SUPER ADMIN USER!');
  }
  return superAdmin._id;
};

module.exports = {
  groupCount,
  groupIdBase,
  createGroupId,
  userCount,
  usernameBase,
  password,
  createUsername,
  createEmail,
  getSuperAdminId,
};

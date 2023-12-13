const { default: DBUserModel } = require('../../dist/back/src/dbModels/user');
const { default: DBGroupModel } = require('../../dist/back/src/dbModels/group');
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
  _superAdminId = superAdmin._id;
  return superAdmin._id;
};

let _basicUsersGroupId;
let _basicUserId;
const getBasicUsersGroupId = async () => {
  if (_basicUsersGroupId) return _basicUsersGroupId;
  const basicUsersGroup = await DBGroupModel.findOne({ simpleId: 'basicUsers' });
  if (!basicUsersGroup) {
    return null;
  }
  _basicUsersGroupId = basicUsersGroup._id;
  return _basicUsersGroupId;
};
const getBasicUserId = async () => {
  if (_basicUserId) return _basicUserId;
  const basicUsersGroup = await DBGroupModel.findOne({ simpleId: 'basicUsers' });
  if (!basicUsersGroup || !basicUsersGroup.members[0]) {
    return null;
  }
  _basicUserId = basicUsersGroup.members[1];
  return _basicUserId;
};
const setBasicUserId = (id) => (_basicUserId = id);

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
  getBasicUsersGroupId,
  getBasicUserId,
  setBasicUserId,
};

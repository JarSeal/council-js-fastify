import { Types } from 'mongoose';
import DBUserModel from '../../src/dbModels/user';
import DBGroupModel from '../../src/dbModels/group';
import { getSuperAdminUsername } from '../../dbMigrations/data/utils';

export const groupCount = 10;
export const groupIdBase = 'testgroup';
export const createGroupId = (i: number) => `${groupIdBase}${i}`;

export const userCount = 100;
export const usernameBase = 'testuser';
export const password = 'password';
export const createUsername = (i: number) => `${usernameBase}${i}`;
export const createEmail = (i: number) => `${createUsername(i)}@council.fastify`;

let _superAdminId: Types.ObjectId;
export const getSuperAdminId = async () => {
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
export const getBasicUsersGroupId = async () => {
  if (_basicUsersGroupId) return _basicUsersGroupId;
  const basicUsersGroup = await DBGroupModel.findOne({ simpleId: 'basicUsers' });
  if (!basicUsersGroup) {
    return null;
  }
  _basicUsersGroupId = basicUsersGroup._id;
  return _basicUsersGroupId;
};
export const getBasicUserId = async () => {
  if (_basicUserId) return _basicUserId;
  const basicUsersGroup = await DBGroupModel.findOne({ simpleId: 'basicUsers' });
  if (!basicUsersGroup || !basicUsersGroup.members[0]) {
    return null;
  }
  _basicUserId = basicUsersGroup.members[1];
  return _basicUserId;
};
export const setBasicUserId = (id) => (_basicUserId = id);

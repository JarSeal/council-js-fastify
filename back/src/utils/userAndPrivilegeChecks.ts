import type { FastifyError, FastifyRequest } from 'fastify';
import type { Types } from 'mongoose';

import DBGroupModel from '../dbModels/group';
import type { AllPrivilegeProps } from '../dbModels/_modelTypePartials';
import { errors } from '../core/errors';
import { isCsrfGood } from '../hooks/csrf';

export type UserData = {
  isSignedIn: boolean;
  userId: Types.ObjectId | null;
  userGroups: Types.ObjectId[];
  isSysAdmin: boolean;
};

export const getUserData = async (req: FastifyRequest): Promise<UserData> => {
  const isSignedIn = req.session?.isSignedIn;
  const userId = req.session?.userId;
  const userData: UserData = {
    isSignedIn: isSignedIn || false,
    userId: isSignedIn ? userId : null,
    userGroups: [],
    isSysAdmin: false,
  };
  if (isSignedIn) {
    let userGroups = await DBGroupModel.find<{ _id: Types.ObjectId; simpleId: string }>({
      members: req.session.userId,
    }).select('_id simpleId');
    userData.userGroups = userGroups.map((ug) => ug._id);
    if (userGroups.find((ug) => ug.simpleId === 'sysAdmins')) {
      userData.isSysAdmin = true;
    }
    userGroups = [];
  }
  return userData;
};

export const privilegeCheckpoint = async (
  req: FastifyRequest,
  privilege?: AllPrivilegeProps | Partial<AllPrivilegeProps> | null
) => {
  const crsfIsGood = isCsrfGood(req);
  const userData = await getUserData(req);
  return checkPrivilege(privilege, userData, crsfIsGood);
};

export const checkPrivilege = (
  privilege: AllPrivilegeProps | Partial<AllPrivilegeProps> | null | undefined,
  userData: UserData,
  csrfIsGood: boolean
): null | FastifyError => {
  // Normalize privilege
  const priv: AllPrivilegeProps = {
    public: 'false',
    requireCsrfHeader: true,
    users: [],
    groups: [],
    excludeUsers: [],
    excludeGroups: [],
    ...privilege,
  };

  if (!privilege) return null;

  // Check CSRF
  if (priv.requireCsrfHeader && !csrfIsGood) {
    return new errors.UNAUTHORIZED('CSRF-header is invalid or missing');
  }
  // Check public
  if ((priv.public === 'false' || priv.public === 'onlySignedIn') && !userData.isSignedIn) {
    return new errors.UNAUTHORIZED('Must be signed in');
  }
  if (priv.public === 'onlyPublic' && userData.isSignedIn) {
    return new errors.SESSION_CANNOT_BE_SIGNED_IN();
  }

  // From here on out, unsigned users and sysAdmins are good to go
  if (!userData.isSignedIn || userData.isSysAdmin) {
    return null;
  }

  // Check excluded users
  if (userData.userId) {
    for (let i = 0; i < priv.excludeUsers.length; i++) {
      if (priv.excludeUsers[i].equals(userData.userId)) {
        return new errors.FORBIDDEN('User is in excluded users');
      }
    }
  }

  // Check excluded groups (compare two arrays and see if none match)
  for (let i = 0; i < priv.excludeGroups.length; i++) {
    const exclGroup = priv.excludeGroups[i];
    for (let j = 0; j < userData.userGroups.length; j++) {
      if (userData.userGroups[j].equals(exclGroup)) {
        return new errors.FORBIDDEN('User is in a group that is excluded');
      }
    }
  }

  // Check included users
  if (userData.userId) {
    for (let i = 0; i < priv.users.length; i++) {
      if (priv.users[i].equals(userData.userId)) {
        // All good
        return null;
      }
    }
  }

  // Check included groups
  for (let i = 0; i < priv.groups.length; i++) {
    const inclGroup = priv.groups[i];
    for (let j = 0; j < userData.userGroups.length; j++) {
      if (userData.userGroups[j].equals(inclGroup)) {
        // All good
        return null;
      }
    }
  }

  // User doesn't have any privileges
  return new errors.FORBIDDEN('No privileges');
};

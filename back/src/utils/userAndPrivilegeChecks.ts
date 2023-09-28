import type { FastifyError, FastifyRequest } from 'fastify';
import type { Types } from 'mongoose';

import DBGroupModel from '../dbModels/group';
import type { AllPrivilegeProps } from '../dbModels/_modelTypePartials';
import { errors } from '../core/errors';

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

export const isPrivBlocked = (
  privilege: AllPrivilegeProps | Partial<AllPrivilegeProps> | undefined,
  userData: UserData,
  csrfIsGood: boolean
): null | FastifyError => {
  if (!privilege) {
    // @Consider: should this case return an error or null?
    return null;
  }

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

  // From here on out, unsigned users and sysAdmins are good to go,
  // because if unsigned users made it this far they area good and
  // because sysAdmins can access everything
  if (!userData.isSignedIn || userData.isSysAdmin) {
    return null;
  }

  // Check included users (n + k + m^2)
  if (userData.userId) {
    for (let i = 0; i < priv.users.length; i++) {
      if (priv.users[i].equals(userData.userId)) {
        // Good to go, if not in excluded users nor groups
        return (
          checkExcludedUsers(userData, priv.excludeUsers) ||
          checkExcludedGroups(userData, priv.excludeGroups)
        );
      }
    }
  }

  // Check included groups (n^2 + k + m^2)
  if (userData.userGroups.length && priv.groups.length) {
    for (let i = 0; i < priv.groups.length; i++) {
      for (let j = 0; j < userData.userGroups.length; j++) {
        if (userData.userGroups[j].equals(priv.groups[i])) {
          return (
            checkExcludedUsers(userData, priv.excludeUsers) ||
            checkExcludedGroups(userData, priv.excludeGroups)
          );
        }
      }
    }
  }

  // User doesn't have any privileges
  return new errors.FORBIDDEN('No privileges');
};

const checkExcludedUsers = (userData: UserData, excludedUsers: Types.ObjectId[]) => {
  // Check excluded users
  if (userData.userId) {
    for (let i = 0; i < excludedUsers.length; i++) {
      if (excludedUsers[i].equals(userData.userId)) {
        return new errors.FORBIDDEN('User in excluded users');
      }
    }
  }
  return null;
};

const checkExcludedGroups = (userData: UserData, excludedGroups: Types.ObjectId[]) => {
  // Check excluded groups (compare two arrays and see if none match)
  if (userData.userGroups.length && excludedGroups.length) {
    for (let i = 0; i < excludedGroups.length; i++) {
      for (let j = 0; j < userData.userGroups.length; j++) {
        if (userData.userGroups[j].equals(excludedGroups[i])) {
          return new errors.FORBIDDEN('User in excluded group');
        }
      }
    }
  }
  return null;
};

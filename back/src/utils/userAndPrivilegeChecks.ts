import type { FastifyError, FastifyRequest } from 'fastify';
import type { Types } from 'mongoose';

import DBGroupModel from '../dbModels/group';
import type { AllPrivilegeProps } from '../dbModels/_modelTypePartials';
import { errors } from '../core/errors';

export const emptyPrivilege: AllPrivilegeProps = {
  public: 'false',
  requireCsrfHeader: true,
  users: [],
  groups: [],
  excludeUsers: [],
  excludeGroups: [],
};

export const emptyFormDataPrivileges = {
  read: emptyPrivilege,
  create: emptyPrivilege,
  edit: emptyPrivilege,
  delete: emptyPrivilege,
};

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
    return new errors.UNAUTHORIZED('Privilege not found');
  }

  // Normalize privilege
  const priv: AllPrivilegeProps = {
    ...emptyPrivilege,
    ...privilege,
  };

  if (!privilege) return null;

  // Check CSRF
  if (priv.requireCsrfHeader && !csrfIsGood) {
    return new errors.UNAUTHORIZED('CSRF-header is invalid or missing');
  }

  // Check public
  if (priv.public === 'false' && !userData.isSignedIn) {
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
          // Good to go, if not in excluded users nor groups
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

export const readDataAsSignedInPrivilegesQuery = (userData: UserData, csrfIsGood: boolean) => [
  { 'privileges.read.public': { $ne: 'onlyPublic' } },
  {
    $or: [
      { 'privileges.read.requireCsrfHeader': { $ne: true } },
      { 'privileges.read.requireCsrfHeader': csrfIsGood },
    ],
  },
  ...(userData.isSysAdmin
    ? []
    : [
        {
          $or: [
            { 'privileges.read.public': 'true' },
            {
              $and: [
                {
                  $or: [
                    { 'privileges.read.users': userData.userId },
                    { 'privileges.read.groups': { $in: userData.userGroups } },
                  ],
                },
                { 'privileges.read.excludeUsers': { $ne: userData.userId } },
                { 'privileges.read.excludeGroups': { $nin: userData.userGroups } },
              ],
            },
          ],
        },
      ]),
];

export const readDataAsSignedOutPrivilegesQuery = (csrfIsGood: boolean) => [
  {
    $or: [{ 'privileges.read.public': 'true' }, { 'privileges.read.public': 'onlyPublic' }],
  },
  {
    $or: [
      { 'privileges.read.requireCsrfHeader': { $ne: true } },
      { 'privileges.read.requireCsrfHeader': csrfIsGood },
    ],
  },
];

export const readDataPrivilegesQuery = (userData: UserData, csrfIsGood: boolean) => {
  if (userData.isSignedIn) {
    return readDataAsSignedInPrivilegesQuery(userData, csrfIsGood);
  }
  return readDataAsSignedOutPrivilegesQuery(csrfIsGood);
};

export const combinePrivileges = (
  ...privileges: Partial<AllPrivilegeProps>[]
): AllPrivilegeProps => {
  const combined = emptyPrivilege;
  for (let i = 0; i < privileges.length; i++) {
    const priv = privileges[i];
    if (priv.public !== undefined) combined.public = priv.public;
    if (priv.requireCsrfHeader !== undefined) combined.requireCsrfHeader = priv.requireCsrfHeader;
    if (priv.users !== undefined) combined.users = priv.users;
    if (priv.groups !== undefined) combined.groups = priv.groups;
    if (priv.excludeUsers !== undefined) combined.excludeUsers = priv.excludeUsers;
    if (priv.excludeGroups !== undefined) combined.excludeGroups = priv.excludeGroups;
  }
  return combined;
};

export const getFormDataElemPrivilegesQuery = (
  currentElemPrivs: string,
  userData: UserData,
  csrfIsGood: boolean
) => ({
  $or: [
    { hasElemPrivileges: false },
    { hasElemPrivileges: userData.isSysAdmin },
    { [currentElemPrivs]: { $exists: false } },
    ...(userData.isSignedIn ? [{ owner: userData.userId }] : []),
    {
      $and: [
        {
          $or: [
            { [`${currentElemPrivs}.requireCsrfHeader`]: { $ne: true } },
            { [`${currentElemPrivs}.requireCsrfHeader`]: csrfIsGood },
          ],
        },
        userData.isSignedIn
          ? {
              // Signed in
              $or: [
                { [`${currentElemPrivs}.public`]: 'true' },
                {
                  $and: [
                    { [`${currentElemPrivs}.public`]: { $ne: 'onlyPublic' } },
                    {
                      $or: [
                        { [`${currentElemPrivs}.users`]: userData.userId },
                        { [`${currentElemPrivs}.groups`]: { $in: userData.userGroups } },
                      ],
                    },
                    { [`${currentElemPrivs}.excludeUsers`]: { $ne: userData.userId } },
                    { [`${currentElemPrivs}.excludeGroups`]: { $nin: userData.userGroups } },
                  ],
                },
              ],
            }
          : {
              // Signed out
              $or: [
                { [`${currentElemPrivs}.public`]: 'true' },
                { [`${currentElemPrivs}.public`]: 'onlyPublic' },
              ],
            },
      ],
    },
  ],
});

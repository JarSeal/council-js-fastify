import type { FastifyError, FastifyRequest } from 'fastify';
import { type Types } from 'mongoose';

import DBGroupModel from '../dbModels/group';
import type {
  AllPrivilegeProps,
  BasicPrivilegeProps,
  UserId,
} from '../dbModels/_modelTypePartials';
import { errors } from '../core/errors';
import type { RequiredActions } from '../features/login/schemas';

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
  requiredActions: RequiredActions;
};

export const getUserData = async (req: FastifyRequest): Promise<UserData> => {
  const isSignedIn = req.session?.isSignedIn;
  const userId = req.session?.userId;
  const userData: UserData = {
    isSignedIn: isSignedIn || false,
    userId: isSignedIn ? userId : null,
    userGroups: [],
    isSysAdmin: false,
    requiredActions: null,
  };
  if (isSignedIn) {
    // @TODO: create a cache in the session object to get the groups
    // (create a system setting for it, default to about 5 minutes)
    let userGroups = await DBGroupModel.find<{ _id: Types.ObjectId; simpleId: string }>({
      members: req.session.userId,
    }).select('_id simpleId');
    userData.userGroups = userGroups.map((ug) => ug._id);
    if (userGroups.find((ug) => ug.simpleId === 'sysAdmins')) {
      userData.isSysAdmin = true;
    }
    userGroups = [];

    if (req.session.requiredActions) {
      userData.requiredActions = req.session.requiredActions;
    }
  }
  return userData;
};

export const isPrivBlocked = (
  privilege: AllPrivilegeProps | Partial<AllPrivilegeProps> | undefined,
  userData: UserData,
  csrfIsGood: boolean,
  owner?: UserId
): null | FastifyError => {
  if (!privilege) {
    return new errors.UNAUTHORIZED('Privilege not found');
  }

  // Normalize privilege
  const priv: AllPrivilegeProps = {
    ...emptyPrivilege,
    ...privilege,
  };

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

  // From here on out if public='true', unsigned and signed in users and sysAdmins
  // are good to go, because if unsigned users made it this far they area good and
  // because sysAdmins and owners can access everything
  const ownerId = owner && '_id' in owner ? owner._id : owner;
  if (
    priv.public === 'true' ||
    priv.public === 'onlyPublic' ||
    userData.isSysAdmin ||
    (ownerId && userData.userId?.equals(ownerId))
  ) {
    return null;
  }

  // Now check if current signed in user is in included users or groups
  // and not in excluded users and groups

  // Check included users (n + k + m^2)
  if (userData.userId && priv.users) {
    for (let i = 0; i < priv.users.length; i++) {
      if (userData.userId.equals(priv.users[i] as Types.ObjectId)) {
        // Good to go, if not in excluded users nor groups
        return (
          checkExcludedUsers(userData, priv.excludeUsers) ||
          checkExcludedGroups(userData, priv.excludeGroups)
        );
      }
    }
  }

  // Check included groups (n^2 + k + m^2)
  if (userData.userGroups.length && priv.groups) {
    for (let i = 0; i < priv.groups.length; i++) {
      for (let j = 0; j < userData.userGroups.length; j++) {
        if (userData.userGroups[j].equals(priv.groups[i] as Types.ObjectId)) {
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

const checkExcludedUsers = (
  userData: UserData,
  excludedUsers: BasicPrivilegeProps['excludeUsers']
) => {
  // Check excluded users
  if (userData.userId && excludedUsers) {
    for (let i = 0; i < excludedUsers.length; i++) {
      if (userData.userId.equals(excludedUsers[i] as Types.ObjectId)) {
        return new errors.FORBIDDEN('User in excluded users');
      }
    }
  }
  return null;
};

const checkExcludedGroups = (
  userData: UserData,
  excludedGroups: BasicPrivilegeProps['excludeGroups']
) => {
  // Check excluded groups (compare two arrays and see if they match or not)
  if (userData.userGroups.length && excludedGroups) {
    for (let i = 0; i < excludedGroups.length; i++) {
      for (let j = 0; j < userData.userGroups.length; j++) {
        if (userData.userGroups[j].equals(excludedGroups[i] as Types.ObjectId)) {
          return new errors.FORBIDDEN('User in excluded group');
        }
      }
    }
  }
  return null;
};

type PrivilegeScope = 'read' | 'edit' | 'create' | 'delete';

const dataAsSignedInPrivilegesQuery = (
  scope: PrivilegeScope,
  userData: UserData,
  csrfIsGood: boolean
) => [
  { [`privileges.${scope}.public`]: { $ne: 'onlyPublic' } },
  {
    $or: [
      { [`privileges.${scope}.requireCsrfHeader`]: { $ne: true } },
      { [`privileges.${scope}.requireCsrfHeader`]: csrfIsGood },
    ],
  },
  ...(userData.isSysAdmin
    ? []
    : [
        {
          $or: [
            { [`privileges.${scope}.public`]: 'true' },
            {
              $and: [
                {
                  $or: [
                    { [`privileges.${scope}.users`]: userData.userId },
                    { [`privileges.${scope}.groups`]: { $in: userData.userGroups } },
                  ],
                },
                { [`privileges.${scope}.excludeUsers`]: { $ne: userData.userId } },
                { [`privileges.${scope}.excludeGroups`]: { $nin: userData.userGroups } },
              ],
            },
          ],
        },
      ]),
];

const dataAsSignedOutPrivilegesQuery = (scope: PrivilegeScope, csrfIsGood: boolean) => [
  {
    $or: [
      { [`privileges.${scope}.public`]: 'true' },
      { [`privileges.${scope}.public`]: 'onlyPublic' },
    ],
  },
  {
    $or: [
      { [`privileges.${scope}.requireCsrfHeader`]: { $ne: true } },
      { [`privileges.${scope}.requireCsrfHeader`]: csrfIsGood },
    ],
  },
];

export const dataPrivilegesQuery = (
  scope: PrivilegeScope,
  userData: UserData,
  csrfIsGood: boolean
) => {
  if (userData.isSignedIn) {
    return dataAsSignedInPrivilegesQuery(scope, userData, csrfIsGood);
  }
  return dataAsSignedOutPrivilegesQuery(scope, csrfIsGood);
};

export const combinePrivileges = (
  ...privileges: Partial<AllPrivilegeProps>[]
): AllPrivilegeProps => {
  const combined = { ...emptyPrivilege };
  for (let i = 0; i < privileges.length; i++) {
    const priv = privileges[i];
    if (priv?.public !== undefined) combined.public = priv.public;
    if (priv?.requireCsrfHeader !== undefined) combined.requireCsrfHeader = priv.requireCsrfHeader;
    if (priv?.users !== undefined) {
      if (priv.users.length && 'simpleId' in priv.users[0]) {
        combined.users = priv.users.map((user) => user._id);
      } else {
        combined.users = priv.users;
      }
    }
    if (priv?.groups !== undefined) {
      if (priv.groups.length && 'simpleId' in priv.groups[0]) {
        combined.groups = priv.groups.map((group) => group._id);
      } else {
        combined.groups = priv.groups;
      }
    }
    if (priv?.excludeUsers !== undefined) {
      if (priv.excludeUsers.length && 'simpleId' in priv.excludeUsers[0]) {
        combined.excludeUsers = priv.excludeUsers.map((user) => user._id);
      } else {
        combined.excludeUsers = priv.excludeUsers;
      }
    }
    if (priv?.excludeGroups !== undefined) {
      if (priv.excludeGroups.length && 'simpleId' in priv.excludeGroups[0]) {
        combined.excludeGroups = priv.excludeGroups.map((group) => group._id);
      } else {
        combined.excludeGroups = priv.excludeGroups;
      }
    }
  }
  return combined;
};

// @TODO: add test
export const combineBasicPrivileges = (
  ...privileges: Partial<AllPrivilegeProps>[]
): BasicPrivilegeProps => {
  const combined: BasicPrivilegeProps = {
    users: [],
    groups: [],
    excludeUsers: [],
    excludeGroups: [],
  };
  for (let i = 0; i < privileges.length; i++) {
    const priv = privileges[i];
    if (priv?.users !== undefined) {
      if (priv.users.length && 'simpleId' in priv.users[0]) {
        combined.users = priv.users.map((user) => user._id);
      } else {
        combined.users = priv.users;
      }
    }
    if (priv?.groups !== undefined) {
      if (priv.groups.length && 'simpleId' in priv.groups[0]) {
        combined.groups = priv.groups.map((group) => group._id);
      } else {
        combined.groups = priv.groups;
      }
    }
    if (priv?.excludeUsers !== undefined) {
      if (priv.excludeUsers.length && 'simpleId' in priv.excludeUsers[0]) {
        combined.excludeUsers = priv.excludeUsers.map((user) => user._id);
      } else {
        combined.excludeUsers = priv.excludeUsers;
      }
    }
    if (priv?.excludeGroups !== undefined) {
      if (priv.excludeGroups.length && 'simpleId' in priv.excludeGroups[0]) {
        combined.excludeGroups = priv.excludeGroups.map((group) => group._id);
      } else {
        combined.excludeGroups = priv.excludeGroups;
      }
    }
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

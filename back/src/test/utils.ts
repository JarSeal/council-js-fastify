import type { Types } from 'mongoose';
import { hash } from 'bcrypt';

import DBGroupModel, { type DBGroup } from '../dbModels/group';
import DBUserModel from '../dbModels/user';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';

export const csrfHeader = { headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } };

let sysAdminId: Types.ObjectId;
export const createSysAdmin = async () => {
  if (sysAdminId) return sysAdminId;
  const passwordHash = await hash('password', 10);
  const dateNow = new Date();
  const sysAdmin = new DBUserModel({
    simpleId: 'superadmin',
    emails: [
      {
        email: 'superadmin@council.fastify',
        verified: true,
        token: null,
        added: dateNow,
      },
    ],
    passwordHash,
    created: {
      user: null,
      publicForm: true,
      date: dateNow,
    },
    systemDocument: true,
    edited: [],
    security: { lastLogins: [], lastLoginAttempts: [] },
  });
  const savedSysAdmin = await sysAdmin.save();
  sysAdminId = savedSysAdmin._id;
  return sysAdminId;
};

export const createUser = async (
  simpleId: string,
  opts?: { verified?: boolean; groupIds?: Types.ObjectId[]; groupSimpleIds?: string[] }
) => {
  const foundUser = await DBUserModel.findOne({ simpleId });
  if (foundUser) return foundUser._id;
  const passwordHash = await hash('password', 10);
  const dateNow = new Date();
  const newUser = new DBUserModel({
    simpleId,
    emails: [
      {
        email: simpleId + '@council.fastify',
        verified: opts?.verified || false,
        token: null,
        added: dateNow,
      },
    ],
    passwordHash,
    created: {
      user: null,
      publicForm: true,
      date: dateNow,
    },
    systemDocument: false,
    edited: [],
    security: { lastLogins: [], lastLoginAttempts: [] },
  });
  const savedUser = await newUser.save();
  if (opts?.groupIds) {
    for (let i = 0; i < opts.groupIds.length; i++) {
      const addedToGroup = await DBGroupModel.findByIdAndUpdate<DBGroup>(opts.groupIds[i], {
        $addToSet: { members: savedUser._id },
      });
      if (addedToGroup && opts?.groupSimpleIds) {
        opts.groupSimpleIds = opts.groupSimpleIds.filter((gr) => gr !== addedToGroup.simpleId);
      }
    }
  }
  if (opts?.groupSimpleIds) {
    for (let i = 0; i < opts.groupSimpleIds.length; i++) {
      await DBGroupModel.findOneAndUpdate(
        { simpleId: opts.groupSimpleIds[i] },
        {
          $addToSet: { members: savedUser._id },
        }
      );
    }
  }
  return savedUser._id;
};

let sysAdminGroupId: Types.ObjectId;
let basicUsersGroupId: Types.ObjectId;
export const createGroup = async (
  simpleId: string,
  ownerUserId?: Types.ObjectId,
  members?: Types.ObjectId[]
) => {
  if (simpleId === 'sysAdmins' && sysAdminGroupId) return sysAdminGroupId;
  if (simpleId === 'basicUsers' && basicUsersGroupId) return basicUsersGroupId;
  const foundGroup = await DBGroupModel.findOne({ simpleId });
  if (foundGroup) return foundGroup._id;
  const dateNow = new Date();
  if (!ownerUserId) ownerUserId = await createSysAdmin();
  const group = new DBGroupModel({
    simpleId,
    name: simpleId,
    description: simpleId,
    created: {
      user: ownerUserId,
      date: dateNow,
    },
    edited: [],
    owner: ownerUserId,
    systemDocument: simpleId === 'sysAdmins' || simpleId === 'basicUsers',
    members: simpleId === 'sysAdmins' ? [await createSysAdmin()] : members || [],
  });
  const savedGroup = await group.save();
  if (simpleId === 'sysAdmins') {
    sysAdminGroupId = savedGroup._id;
  }
  if (simpleId === 'basicUsers') {
    basicUsersGroupId = savedGroup._id;
  }
  return savedGroup._id;
};

let sysDocumentsCreated = false;
export const createSysDocuments = async () => {
  if (sysDocumentsCreated) return;

  await createSysAdmin();
  await createGroup('sysAdmins');
  await createGroup('basicUsers');

  sysDocumentsCreated = true;
};

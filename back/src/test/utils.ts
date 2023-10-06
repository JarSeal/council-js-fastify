import type { Types } from 'mongoose';
import { hash } from 'bcrypt';

import DBGroupModel, { type DBGroup } from '../dbModels/group';
import DBUserModel from '../dbModels/user';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';
import DBFormModel from '../dbModels/form';
import type {
  AllPrivilegeProps,
  FormDataPrivileges,
  FormDataValueType,
  FormElem,
} from '../dbModels/_modelTypePartials';
import DBFormDataModel from '../dbModels/formData';
import DBPrivilegeModel from '../dbModels/privilege';

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

export const createForm = async (
  formId: string,
  url: string,
  elems: FormElem[],
  privileges: {
    priCategoryId: string;
    priTargetId: string;
    priAccessId: string;
    privilegeAccess: Partial<AllPrivilegeProps>;
    created?: Date;
    name?: string;
    description?: string;
  }[],
  opts?: {
    owner?: Types.ObjectId;
    name?: string;
    description?: string;
    disablePartialSaving?: boolean;
    maxDataOwnerDocs?: number;
    formDataOwner?: Types.ObjectId;
    fillerIsFormDataOwner?: boolean;
    formDataDefaultPrivileges?: AllPrivilegeProps;
    formTitle?: string;
    formText?: string;
    lockOrder?: boolean;
  }
) => {
  const adminId = await createSysAdmin();

  const form = new DBFormModel({
    simpleId: formId,
    url,
    name: opts?.name || 'Test from, ' + formId,
    description: opts?.description || 'Test form description, ' + formId,
    created: {
      user: adminId,
      date: new Date(),
    },
    owner: opts?.owner || adminId,
    disablePartialSaving: opts?.disablePartialSaving || false,
    form: {
      formTitle: { langKey: opts?.formTitle || 'Form title' },
      formText: { langKey: opts?.formText || 'Form text' },
      lockOrder: opts?.lockOrder || false,
      formElems: elems,
    },
  });
  if (opts?.maxDataOwnerDocs) form.maxDataOwnerDocs = opts.maxDataOwnerDocs;
  if (opts?.formDataOwner) form.formDataOwner = opts.formDataOwner;
  if (opts?.fillerIsFormDataOwner) form.fillerIsFormDataOwner = opts.fillerIsFormDataOwner;
  if (opts?.formDataDefaultPrivileges) form.formDataDefaultPrivileges;

  const createdForm = await form.save();
  for (let i = 0; i < privileges.length; i++) {
    const privilege = privileges[i];
    await createPrivilege(
      privilege.priCategoryId,
      privilege.priTargetId,
      privilege.priAccessId,
      privilege.privilegeAccess
    );
  }

  return createdForm._id;
};

export const createFormData = async (
  formId: string,
  url: string,
  privileges: FormDataPrivileges,
  data: {
    elemId: string;
    orderNr: number;
    value: unknown;
    valueType: FormDataValueType;
    privileges?: Omit<FormDataPrivileges, 'create'>;
  }[],
  opts?: {
    owner?: Types.ObjectId;
  }
) => {
  const adminId = await createSysAdmin();

  const formData = new DBFormDataModel({
    formId,
    url,
    created: {
      user: adminId,
      date: new Date(),
    },
    owner: opts?.owner || null,
    hasElemPrivileges: Boolean(data.find((d) => d.privileges)),
    privileges,
    data,
  });

  const createdFormData = await formData.save();

  return createdFormData._id;
};

export const createPrivilege = async (
  priCategoryId: string,
  priTargetId: string,
  priAccessId: string,
  privilegeAccess: Partial<AllPrivilegeProps>,
  opts?: { name?: string; description?: string; created?: Date }
) => {
  const privilege = new DBPrivilegeModel({
    simpleId: `${priCategoryId}__${priTargetId}__${priAccessId}`,
    priCategoryId,
    priTargetId,
    priAccessId,
    name: opts?.name || `${priCategoryId}, ${priTargetId}, ${priAccessId}`,
    description: opts?.description || 'Privilege description',
    created: opts?.created || new Date(),
    privilegeAccess: { ...emptyPrivileges, ...privilegeAccess },
  });

  const createdPrivilege = await privilege.save();

  return createdPrivilege._id;
};

export const emptyPrivileges: AllPrivilegeProps = {
  public: 'false',
  requireCsrfHeader: true,
  users: [],
  groups: [],
  excludeUsers: [],
  excludeGroups: [],
};

export const emptyFormDataPrivileges = {
  read: emptyPrivileges,
  create: emptyPrivileges,
  edit: emptyPrivileges,
  delete: emptyPrivileges,
};

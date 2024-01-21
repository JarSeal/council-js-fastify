import type { Types } from 'mongoose';
import { hash } from 'bcrypt';

import DBGroupModel, { type DBGroup } from '../dbModels/group';
import DBUserModel from '../dbModels/user';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';
import DBFormModel from '../dbModels/form';
import type {
  AllPrivilegeProps,
  BasicPrivilegeProps,
  FormDataPrivileges,
  FormDataValueType,
  FormElem,
} from '../dbModels/_modelTypePartials';
import DBFormDataModel from '../dbModels/formData';
import DBPrivilegeModel from '../dbModels/privilege';
import { emptyFormDataPrivileges, emptyPrivilege } from '../utils/userAndPrivilegeChecks';

export const csrfHeader = { headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } };
export const validAgentId = '726616f4bb878fab94f1f1dbc8c6ed79';

let sysAdminId: Types.ObjectId;
export const createSysAdmin = async (asNew?: boolean) => {
  if (!asNew && sysAdminId) return sysAdminId;
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
  await createGroup('sysAdmins', sysAdminGroupId, [sysAdminId], asNew);
  return sysAdminId;
};

export const createUser = async (
  simpleId: string,
  opts?: {
    verified?: boolean;
    groupIds?: Types.ObjectId[];
    groupSimpleIds?: string[];
    password?: string;
    email?: string;
    forcePassChange?: boolean;
  }
) => {
  const foundUser = await DBUserModel.findOne({ simpleId });
  if (foundUser) return foundUser._id;
  const passwordHash = await hash(opts?.password || 'password', 10);
  const dateNow = new Date();
  const newUser = new DBUserModel({
    simpleId,
    emails: [
      {
        email: opts?.email || simpleId + '@council.fastify',
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
    security: {
      lastLogins: [],
      lastLoginAttempts: [],
      forcePassChange: opts?.forcePassChange || false,
    },
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
  members?: Types.ObjectId[],
  asNew?: boolean
) => {
  if (!asNew && simpleId === 'sysAdmins' && sysAdminGroupId) return sysAdminGroupId;
  if (!asNew && simpleId === 'basicUsers' && basicUsersGroupId) return basicUsersGroupId;
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
    maxDataCreatorDocs?: number;
    formDataOwner?: Types.ObjectId;
    fillerIsFormDataOwner?: boolean;
    addFillerToPrivileges?: string[];
    formDataDefaultPrivileges?: {
      read?: Partial<AllPrivilegeProps>;
      create?: Partial<AllPrivilegeProps>;
      edit?: Partial<AllPrivilegeProps>;
      delete?: Partial<AllPrivilegeProps>;
    };
    formTitle?: string;
    formText?: string;
    lockOrder?: boolean;
    canEditPrivileges?: BasicPrivilegeProps;
    systemDocument?: boolean;
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
    form: {
      formTitle: { langKey: opts?.formTitle || 'Form title' },
      formText: { langKey: opts?.formText || 'Form text' },
      lockOrder: opts?.lockOrder || false,
      formElems: elems,
    },
  });
  if (opts?.maxDataCreatorDocs) form.maxDataCreatorDocs = opts.maxDataCreatorDocs;
  if (opts?.formDataOwner) form.formDataOwner = opts.formDataOwner;
  if (opts?.fillerIsFormDataOwner) form.fillerIsFormDataOwner = opts.fillerIsFormDataOwner;
  if (opts?.addFillerToPrivileges) form.addFillerToPrivileges = opts.addFillerToPrivileges;
  if (opts?.canEditPrivileges) form.canEditPrivileges = opts.canEditPrivileges;
  if (opts?.systemDocument) form.systemDocument = opts.systemDocument;

  form.formDataDefaultPrivileges = {
    read: {
      ...emptyFormDataPrivileges.read,
      ...(opts?.formDataDefaultPrivileges?.read || {}),
    },
    create: {
      ...emptyFormDataPrivileges.create,
      ...(opts?.formDataDefaultPrivileges?.create || {}),
    },
    edit: {
      ...emptyFormDataPrivileges.edit,
      ...(opts?.formDataDefaultPrivileges?.edit || {}),
    },
    delete: {
      ...emptyFormDataPrivileges.delete,
      ...(opts?.formDataDefaultPrivileges?.delete || {}),
    },
  };

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
  privileges: Partial<{
    read: Partial<Partial<AllPrivilegeProps>>;
    edit: Partial<Partial<AllPrivilegeProps>>;
    delete: Partial<Partial<AllPrivilegeProps>>;
  }>,
  data: {
    elemId: string;
    orderNr: number;
    value: unknown;
    valueType: FormDataValueType;
    privileges?: Partial<Omit<FormDataPrivileges, 'create'>>;
  }[],
  opts?: {
    owner?: Types.ObjectId;
  }
) => {
  const form = await DBFormModel.findOne({ simpleId: formId });
  const adminId = await createSysAdmin();

  privileges.read = {
    ...emptyPrivilege,
    ...(form?.formDataDefaultPrivileges?.read || {}),
    ...(privileges.read || {}),
  };
  privileges.edit = {
    ...emptyPrivilege,
    ...(form?.formDataDefaultPrivileges?.edit || {}),
    ...(privileges.edit || {}),
  };
  privileges.delete = {
    ...emptyPrivilege,
    ...(form?.formDataDefaultPrivileges?.delete || {}),
    ...(privileges.delete || {}),
  };

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
    privilegeAccess: { ...emptyPrivilege, ...privilegeAccess },
  });

  const createdPrivilege = await privilege.save();

  return createdPrivilege._id;
};

export const createSysSettings = async () => {
  const timeNow = new Date();
  return await createForm(
    'systemSettings',
    '/api/v1/sys/system-settings',
    [
      {
        elemId: 'forceEmailVerification',
        orderNr: 0,
        elemType: 'inputDropDown',
        valueType: 'string',
        elemData: {
          defaultValue: 'disabled',
          options: [
            { label: { langKey: 'Disabled' }, value: 'disabled' },
            { label: { langKey: 'Enabled' }, value: 'enabled' },
          ],
          category: 'security',
          description: {
            langKey:
              "Whether users' must verify their E-mail before being able to use the service or not.",
          },
        },
        label: { langKey: 'Force E-mail verification' },
      },
      {
        elemId: 'use2FA',
        orderNr: 1,
        elemType: 'inputDropDown',
        valueType: 'string',
        elemData: {
          defaultValue: 'disabled',
          options: [
            { label: { langKey: 'Disabled' }, value: 'disabled' },
            { label: { langKey: 'Enabled' }, value: 'enabled' },
            { label: { langKey: 'User chooses' }, value: 'user_chooses' },
            {
              label: { langKey: 'User chooses, set to disabled for all' },
              value: 'user_chooses_and_set_to_disabled_for_all',
            },
            {
              label: { langKey: 'User chooses, set to enabled for all' },
              value: 'user_chooses_and_set_to_enabled_for_all',
            },
          ],
          category: 'security',
          publicSetting: true,
          description: {
            langKey:
              'Whether to enable 2-factor authentication for all users or not, or whether users can choose to enable 2FA for themselves.',
          },
        },
        label: { langKey: 'Use 2-factor authentication' },
      },
      {
        elemId: 'defaultEditedHistoryCount',
        orderNr: 2,
        elemType: 'inputNumber',
        valueType: 'number',
        elemData: {
          defaultValue: 10,
          minValue: 0,
          category: 'logs',
          description: {
            langKey:
              'How many edited logs are logged by default to all edited history arrays (0 - Infinity).',
          },
        },
        label: { langKey: 'Default edited history count' },
      },
    ],
    [
      {
        priCategoryId: 'form',
        priTargetId: 'systemSettings',
        priAccessId: 'canUseForm',
        name: 'Use form: Council System Settings',
        description: 'Who can use the "Council System Settings" form.',
        created: timeNow,
        privilegeAccess: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
      },
      {
        priCategoryId: 'form',
        priTargetId: 'systemSettings',
        priAccessId: 'canReadData',
        name: 'Read data: Council System Settings',
        description: 'Who can use read "Council System Settings" data.',
        created: timeNow,
        privilegeAccess: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
      },
      {
        priCategoryId: 'form',
        priTargetId: 'systemSettings',
        priAccessId: 'canEditData',
        name: 'Edit data: Council System Settings',
        description: 'Who can use edit "Council System Settings" data.',
        created: timeNow,
        privilegeAccess: {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        },
      },
    ],
    { systemDocument: true }
  );
};

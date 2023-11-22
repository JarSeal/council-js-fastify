import { Schema } from 'mongoose';

export const simpleIdDBSchema = {
  type: String,
  required: true,
  unique: true,
};

export const emailDBSchema = {
  type: String,
  required: true,
  unique: true,
  minlength: 6,
  index: true,
};

export const tokenDbSchema = {
  token: {
    type: String,
    default: null,
  },
  tokenId: {
    type: String,
    default: null,
  },
};

export const dateDBSchema = {
  type: Date,
  required: true,
};

export const mongoIdArraySchema = [
  {
    _id: false,
    type: Schema.Types.ObjectId,
  },
];

export const transTextDbSchema = {
  langs: { type: Object },
  langKey: { type: String },
};

export const basicPrivilegePropsSchema = {
  users: { type: mongoIdArraySchema, default: undefined },
  groups: { type: mongoIdArraySchema, default: undefined },
  excludeUsers: { type: mongoIdArraySchema, default: undefined },
  excludeGroups: { type: mongoIdArraySchema, default: undefined },
};

export const allPrivilegePropsSchema = {
  public: { type: String },
  requireCsrfHeader: { type: Boolean },
  ...basicPrivilegePropsSchema,
};

export const formDataPrivilegesSchema = {
  read: allPrivilegePropsSchema,
  create: allPrivilegePropsSchema,
  edit: allPrivilegePropsSchema,
  delete: allPrivilegePropsSchema,
};

export const formElemDbSchema = {
  _id: false,
  elemId: { type: String, required: true },
  orderNr: { type: Number, required: true },
  elemType: { type: String, required: true },
  valueType: { type: String, required: true, default: 'unknown' },
  classes: [{ _id: false, type: String }],
  elemData: { type: Object },
  label: transTextDbSchema,
  required: { type: Boolean },
  validationRegExp: { pattern: { type: String }, flags: { type: String } },
  mustMatchValue: { type: String },
  validationFn: { type: String },
  inputErrors: [
    {
      _id: false,
      errorId: String,
      message: transTextDbSchema,
    },
  ],
  doNotSave: { type: Boolean, default: false },
  privileges: Schema.Types.Mixed,
};

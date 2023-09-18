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

export const basicPrivilegePropsSchema = {
  users: mongoIdArraySchema,
  groups: mongoIdArraySchema,
  excludeUsers: mongoIdArraySchema,
  excludeGroups: mongoIdArraySchema,
};

export const allPrivilegePropsSchema = {
  public: { type: String, required: true, default: 'false' },
  requireCsrfHeader: { type: Boolean },
  ...basicPrivilegePropsSchema,
};

export const formDataPrivilegesSchema = {
  read: allPrivilegePropsSchema,
  create: allPrivilegePropsSchema,
  edit: basicPrivilegePropsSchema,
  delete: basicPrivilegePropsSchema,
};

export const formElemDbSchema = {
  _id: false,
  elemId: { type: String, required: true },
  orderNr: { type: Number, required: true },
  elemType: { type: String, required: true },
  valueType: { type: String, required: true, default: 'unknown' },
  classes: [{ _id: false, type: String }],
  elemData: { type: Object },
  label: { type: Object },
  labelLangKey: { type: String },
  required: { type: Boolean },
  validationRegExp: { type: String },
  mustMatchValue: { type: String },
  validationFn: { type: String },
  inputErrors: [
    {
      errorId: String,
      message: Object,
      messageLangKey: String,
    },
  ],
  doNotSave: { type: Boolean, default: false },
  privileges: formDataPrivilegesSchema,
};

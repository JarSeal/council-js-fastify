import type { Types } from 'mongoose';

export type Edited = {
  user: Types.ObjectId;
  date: Date;
}[];

export type Token = {
  token?: string | null;
  tokenId?: string | null;
};

export type FormElemType =
  | 'text'
  | 'button'
  | 'inputCheckbox'
  | 'inputRadioGroup'
  | 'inputDropDown'
  | 'inputText'
  | 'inputNumber'
  | 'hidden';

export type FormDataValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  | 'stringArray'
  | 'numberArray'
  | 'booleanArray'
  | 'dateArray'
  | 'objectArray'
  | 'array'
  | 'object'
  | 'none'
  | 'unknown';

export type AllPrivilegeProps = {
  public: 'true' | 'false' | 'onlyPublic' | 'onlySignedIn';
  requireCsrfHeader: boolean;
  users: Types.ObjectId[];
  groups: Types.ObjectId[];
  excludeUsers: Types.ObjectId[];
  excludeGroups: Types.ObjectId[];
};

export type FormDataPrivileges = {
  read: AllPrivilegeProps;
  create: AllPrivilegeProps;
  edit: AllPrivilegeProps;
  delete: AllPrivilegeProps;
};

export type FormDataOwner = 'none' | 'user' | Types.ObjectId;

export type FormElem = {
  _id?: boolean;
  elemId: string;
  orderNr: number;
  elemType: FormElemType;
  classes?: string[];
  elemData?: { [key: string]: unknown };
  valueType: FormDataValueType;
  label?: { [key: string]: string };
  labelLangKey?: string;
  required: boolean;
  validationRegExp?: string[];
  mustMatchValue?: string;
  validationFn?: string;
  inputErrors: {
    errorId: string;
    message?: { [langKey: string]: string };
    messageLangKey?: string;
  }[];
  doNotSave?: boolean;
  privileges: FormDataPrivileges | null;
};

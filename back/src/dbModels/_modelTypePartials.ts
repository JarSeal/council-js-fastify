import type { Types } from 'mongoose';

export type Edited = {
  user: Types.ObjectId;
  date: Date;
}[];

export type Token = {
  token?: string | null;
  tokenId?: string | null;
};

export type TransText = {
  langs?: { [key: string]: string };
  langKey?: string;
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
  // Form element ID (simpleId)
  elemId: string;

  // Order number
  orderNr: number;

  // Element type
  elemType: FormElemType;

  // Value type
  valueType: FormDataValueType;

  // CSS classes
  classes?: string[];

  // Specific element type element data
  elemData?: { [key: string]: unknown };

  // Label
  label?: TransText;

  // Validation
  required: boolean;
  validationRegExp?: string[];
  mustMatchValue?: string;
  validationFn?: string;

  // All possible errors to be shown in the client
  inputErrors: {
    errorId: string;
    message?: TransText;
  }[];

  // Whether to save or not save this value to formData document
  doNotSave?: boolean;

  // Form data privileges
  privileges: FormDataPrivileges | null;
};

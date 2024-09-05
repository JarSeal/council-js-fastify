import type { Types } from 'mongoose';

export type UserId = Types.ObjectId | { simpleId: string; _id: Types.ObjectId } | null;
export type GroupId = Types.ObjectId | { simpleId: string; name: string; _id: Types.ObjectId };

export type Edited = {
  user: UserId;
  date: Date;
};

export type Token = {
  token?: string | null;
  tokenId?: string | null;
};

export type TransText =
  | {
      langs: { [key: string]: string };
      langKey?: string;
      params?: { [key: string]: string };
    }
  | {
      langs?: { [key: string]: string };
      langKey: string;
      params?: { [key: string]: string };
    }
  | string;
export type FormElemType =
  | 'text'
  | 'button'
  | 'inputCheckbox'
  | 'inputRadioGroup'
  | 'inputDropDown'
  | 'inputText'
  | 'inputNumber'
  | 'inputSecret'
  | 'hidden';

export type FormDataValueType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'date'
  // | 'stringArray'
  // | 'numberArray'
  // | 'booleanArray'
  // | 'dateArray'
  // | 'objectArray'
  // | 'array'
  // | 'object'
  | 'none'
  | 'unknown';

export type PublicPrivilegeProp = 'true' | 'false' | 'onlyPublic';

export type BasicPrivilegeProps = {
  users?: NonNullable<UserId>[];
  groups?: GroupId[];
  excludeUsers?: NonNullable<UserId>[];
  excludeGroups?: GroupId[];
};

export type AllPrivilegeProps = BasicPrivilegeProps & {
  public: PublicPrivilegeProp;
  requireCsrfHeader: boolean;
};

export type AllPrivilegePropsAsStringIds = {
  public?: PublicPrivilegeProp;
  requireCsrfHeader?: boolean;
  users?: string[];
  groups?: string[];
  excludeUsers?: string[];
  excludeGroups?: string[];
};

export type FormDataPrivileges = {
  read?: Partial<AllPrivilegeProps>;
  create?: Partial<AllPrivilegeProps>;
  edit?: Partial<AllPrivilegeProps>;
  delete?: Partial<AllPrivilegeProps>;
};

export type FormDataPrivilegesAsStringIds = {
  read?: Partial<AllPrivilegePropsAsStringIds>;
  create?: Partial<AllPrivilegePropsAsStringIds>;
  edit?: Partial<AllPrivilegePropsAsStringIds>;
  delete?: Partial<AllPrivilegePropsAsStringIds>;
};

export type FormElem = {
  // Form element ID (simpleId)
  elemId: string;

  // Order number
  orderNr: number;

  // Element type
  elemType: FormElemType;

  // Value type
  valueType: FormDataValueType;

  // Default value (will be converted from string to appropriate value)
  defaultValue?: string;

  // CSS classes
  classes?: string[];

  // Specific element type element data
  elemData?: { [key: string]: unknown };

  // Label
  label?: TransText;

  // Validation
  required?: boolean;
  validationRegExp?: { pattern: string; flags?: string };
  mustMatchValue?: string;
  validationFn?: string;

  // All possible errors to be shown in the client
  inputErrors?: {
    errorId: string;
    message?: TransText;
  }[];

  // Whether to save or not save this value to formData document
  doNotSave?: boolean;

  // Form data privileges
  privileges?: FormDataPrivileges | null;
};

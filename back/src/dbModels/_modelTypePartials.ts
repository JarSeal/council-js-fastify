import type { Types } from 'mongoose';

export type Edited = {
  user: Types.ObjectId;
  date: Date;
}[];

export type Token = {
  token: string | null;
  tokenId: string | null;
};

export type FormElemType =
  | 'fieldset'
  | 'text'
  | 'heading'
  | 'submitButton'
  | 'resetButton'
  | 'inputCheckbox'
  | 'inputRadioGroup'
  | 'inputDropDown'
  | 'inputText'
  | 'inputTextArea'
  | 'inputNumber'
  | 'hidden';

export type AllPrivilegeProps = {
  public: 'true' | 'false' | 'onlyPublic' | 'onlySignedIn';
  requireCsrfHeader?: boolean;
  users: Types.ObjectId[];
  groups: Types.ObjectId[];
  excludeUsers: Types.ObjectId[];
  excludeGroups: Types.ObjectId[];
};

export type FormDataPrivileges = {
  read: AllPrivilegeProps;
  edit: Omit<AllPrivilegeProps, 'public' | 'requireCsrfHeader'>;
  delete: Omit<AllPrivilegeProps, 'public' | 'requireCsrfHeader'>;
};

export type FormElem = {
  _id?: boolean;
  elemId: string;
  orderNr: number;
  elemType: FormElemType;
  classes?: string[];
  elemData?: { [key: string]: unknown };
  defaultValue?: unknown;
  label?: { [key: string]: string };
  labelLangKey?: string;
  required: boolean;
  validationRegExp?: string[];
  mustMatchValue?: string;
  validationFn?: string;
  errors: {
    errorId: string;
    message?: { [langKey: string]: string };
    messageLangKey?: string;
  }[];
  doNotSend?: boolean;
  children?: Omit<FormElem, 'children'>[];
  privileges?: FormDataPrivileges;
};

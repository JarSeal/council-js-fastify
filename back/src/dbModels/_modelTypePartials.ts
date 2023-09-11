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

export type FormElem = {
  _id?: boolean;
  elemId: string;
  orderNr: number;
  elemType: FormElemType;
  classes?: string[];
  elemData?: { [key: string]: unknown };
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
};

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
    required: true,
    default: null,
  },
  tokenId: {
    type: String,
    required: true,
    default: null,
  },
};

export const dateDBSchema = {
  type: Date,
  required: true,
};

export const mongoIdArray = [
  {
    _id: false,
    type: Schema.Types.ObjectId,
  },
];

export const formElemDbSchema = {
  _id: false,
  elemId: { type: String, required: true },
  orderNr: { type: Number, required: true },
  elemType: { type: String, required: true },
  classes: [{ _id: false, type: String }],
  elemData: { type: Object },
  label: { type: Object },
  labelLangKey: { type: String },
  required: { type: Boolean },
  validationRegExp: { type: String },
  mustMatchValue: { type: String },
  validationFn: { type: String },
  errors: [
    {
      errorId: String,
      message: Object,
      messageLangKey: String,
    },
  ],
  doNotSend: { type: Boolean },
  children: [
    {
      _id: false,
      elemId: { type: String, required: true },
      orderNr: { type: Number, required: true },
      elemType: { type: String, required: true },
      classes: [{ _id: false, type: String }],
      elemData: { type: Object },
      label: { type: Object },
      labelLangKey: { type: String },
      required: { type: Boolean },
      validationRegExp: [{ type: String }],
      mustMatchValue: { type: String },
      validationFn: { type: String },
      errors: [
        {
          errorId: String,
          message: Object,
          messageLangKey: String,
        },
      ],
      doNotSend: { type: Boolean },
    },
  ],
};

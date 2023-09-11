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
  elemId: String,
  orderNr: Number,
  elemType: String,
  classes: [{ _id: false, type: String }],
  elemData: Object,
  label: Object,
  labelLangKey: String,
  required: { type: Boolean, default: false },
  validationRegExp: String,
  errors: [
    {
      errorId: String,
      message: Object,
      messageLangKey: String,
    },
  ],
  children: [
    {
      _id: false,
      elemId: String,
      orderNr: Number,
      elemType: String,
      classes: [{ _id: false, type: String }],
      elemData: Object,
      label: Object,
      labelLangKey: String,
      required: { type: Boolean, default: false },
      validationRegExp: String,
      errors: [
        {
          errorId: String,
          message: Object,
          messageLangKey: String,
        },
      ],
    },
  ],
};

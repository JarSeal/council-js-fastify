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

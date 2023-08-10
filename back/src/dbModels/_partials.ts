export const simpleIdDBSchema = {
  type: String,
  required: true,
  unique: true,
};

export const emailDBSchema = {
  type: String,
  required: true,
  unique: true,
  minlength: 5,
  index: true,
};

export const dateDBSchema = {
  type: Date,
  required: true,
};

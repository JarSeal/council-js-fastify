export const simpleIdSchema = {
  type: String,
  required: true,
  unique: true,
};

export const emailSchema = {
  type: String,
  required: true,
  unique: true,
  minlength: 5,
  index: true,
};

export const dateSchema = {
  type: Date,
  required: true,
};

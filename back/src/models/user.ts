import mongoose from 'mongoose';

const simpleIdSchema = {
  type: String,
  required: true,
  unique: true,
};

const emailSchema = {
  type: String,
  required: true,
  unique: true,
  minlength: 5,
  index: true,
};

const dateSchema = {
  type: Date,
  required: true,
};

const userSchema = new mongoose.Schema({
  simpleId: simpleIdSchema,
  emails: [
    {
      _id: false,
      email: emailSchema,
      prevEmail: { ...emailSchema, required: false, unique: false },
      verified: {
        type: Boolean,
        required: true,
        default: false,
      },
      token: {
        type: String,
        default: null,
      },
    },
  ],
  passwordHash: String,
  created: {
    user: {
      type: mongoose.Schema.Types.ObjectId,
    },
    publicForm: Boolean,
    date: dateSchema,
  },
  edited: [
    {
      _id: false,
      user: {
        type: mongoose.Schema.Types.ObjectId,
      },
      date: dateSchema,
    },
  ],
});

userSchema.set('toJSON', {
  transform: (_, returnedObject) => {
    returnedObject.id = String(returnedObject._id);
    delete returnedObject._id;
    delete returnedObject.__v;
    delete returnedObject.passwordHash;
  },
});

const User = mongoose.model('User', userSchema, 'users');

export default User;

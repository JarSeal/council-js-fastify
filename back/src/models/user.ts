import mongoose from 'mongoose';

const emailType = {
  type: String,
  required: true,
  unique: true,
  minlength: 5,
  index: true,
};

const userSchema = new mongoose.Schema({
  email: emailType,
  passwordHash: String,
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

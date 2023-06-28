import mongoose from 'mongoose';

const stopTest = async (): Promise<void> => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
};

module.exports = stopTest;
export default stopTest;

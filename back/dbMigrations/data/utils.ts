import { config } from 'dotenv';
import mongoose from 'mongoose';

import { hashString } from '../../src/utils/parsingAndConverting';
import { MONGODB_URI } from '../../src/core/config';

config({ path: '../.env' });
if (!process.env.MONGODB_URI) {
  config();
  if (!process.env.MONGODB_URI) {
    throw new Error('./data/utils.ts: MONGODB_URI env variable not found!');
  }
}

const DEFAULT_ADMIN_USERNAME = 'superadmin';
const DEFAULT_ADMIN_EMAIL = DEFAULT_ADMIN_USERNAME + '@council.fastify';
const DEFAULT_PASSWORD = 'changepassword';

export const getSuperAdminUsername = () =>
  process.env.SUPER_ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME;
export const getSuperAdminEmail = () => process.env.SUPER_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL;
export const getSuperAdminPassword = async () =>
  await hashString(process.env.SUPER_ADMIN_PASSWORD || DEFAULT_PASSWORD);

export const isMongooseConnected = () => mongoose.connection.readyState === 1;
export const connectMongoose = async () => {
  if (!isMongooseConnected()) {
    await mongoose.connect(MONGODB_URI);
  }
};
export const disconnectMongoose = async () => await mongoose.disconnect();

import { config } from 'dotenv';

config({ path: '../.env' });
if (!process.env.MONGODB_URI) {
  config();
  if (!process.env.MONGODB_URI) {
    throw new Error('./index.ts: MONGODB_URI env variable not found!');
  }
}

export default {
  uri: process.env.MONGODB_URI,
  migrationsPath: 'dbMigrations/migrations',
  collection: 'migrations_changelog',
};

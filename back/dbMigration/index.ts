import { config } from 'dotenv';
// import path from 'path';
// import { fileURLToPath } from 'url';

config({ path: '../.env' });
if (!process.env.MONGODB_URI) {
  config();
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI env variable not found!');
  }
}

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

export default {
  uri: process.env.MONGODB_URI,
  migrationsPath: 'migrations',
  collection: 'migrations_changelog',
};

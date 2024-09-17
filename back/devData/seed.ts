/* eslint-disable no-console */
import { initDB, closeDB } from '../src/core/db.js';
import { createForms } from './data/forms.js';
import { createGroups } from './data/groups.js';
import { createUsers } from './data/users.js';

const createSeedData = async () => {
  await createGroups();
  await createUsers();
  await createForms();
};

const runScripts = async () => {
  console.log('\x1b[33m\nCREATING SEED DATA\n');
  await initDB();
  console.log('****************\x1b[0m');
  await createSeedData();
  console.log('\x1b[33m\n****************');
  await closeDB();
  console.log('\x1b[0m');
  process.exit(0);
};

runScripts();

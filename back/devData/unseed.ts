/* eslint-disable no-console */
import { initDB, closeDB } from '../src/core/db.js';
import { removeForms } from './data/forms.js';
import { removeGroups } from './data/groups.js';
import { removeUsers } from './data/users.js';

const removeSeedData = async () => {
  await removeForms();
  await removeUsers();
  await removeGroups();
};

const runScripts = async () => {
  console.log('\x1b[33m\nREMOVING SEED DATA\n');
  await initDB();
  console.log('****************\x1b[0m');
  await removeSeedData();
  console.log('\x1b[33m\n****************');
  await closeDB();
  console.log('\x1b[0m');
  process.exit(0);
};

runScripts();

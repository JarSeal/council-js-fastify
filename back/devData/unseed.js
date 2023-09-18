const { initDB, closeDB } = require('../dist/back/src/core/db.js');
const { removeForms } = require('./data/forms.js');
const { removeGroups } = require('./data/groups.js');
const { removeUsers } = require('./data/users.js');

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

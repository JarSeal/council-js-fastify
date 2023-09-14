const { initDB, closeDB } = require('../dist/back/src/core/db.js');
const { createUsers } = require('./data/users.js');

const createSeedData = async () => {
  await createUsers();
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

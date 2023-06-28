import { initDTestDB } from './../src/core/db';

const startTest = async (): Promise<void> => {
  const db = await initDTestDB();
  if (!db) {
    throw new Error('Could not connect to test DB');
  }
};

module.exports = startTest;
export default startTest;

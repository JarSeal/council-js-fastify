const privilegesData = require('../data/system-privileges');

console.log('DATA', privilegesData);

module.exports = {
  async up(db, client) {
    // await db.collection('privileges').insertMany();
  },

  async down(db, client) {
    // for (let i = 0; i < data.length; i++) {}
    // await db.collection('privileges').deleteMany({ systemDocument: true });
  },
};

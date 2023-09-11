const systemGroups = require('../data/system-groups');
const { getSuperAdminUsername, sysAdminGroupId, basicUsersGroupId } = require('../data/utils');

module.exports = {
  async up(db) {
    // Get superadmin MongoId
    const superUser = await db.collection('users').findOne({ simpleId: getSuperAdminUsername() });

    // Create system groups
    for (let i = 0; i < systemGroups.length; i++) {
      const foundGroup = await db
        .collection('groups')
        .findOne({ simpleId: systemGroups[i].simpleId });
      if (!foundGroup) {
        // Add super user as the creator and owner (owner is important)
        systemGroups[i].created.user = superUser._id;
        systemGroups[i].owner = superUser._id;
        await db.collection('groups').insertOne(systemGroups[i]);
      }
    }
  },

  async down(db) {
    for (let i = 0; i < systemGroups.length; i++) {
      await db.collection('groups').deleteOne({ simpleId: systemGroups[i].simpleId });
    }
  },
};

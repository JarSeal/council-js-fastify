const systemForms = require('../data/system-forms');
const { getSuperAdminUsername } = require('../data/utils');

module.exports = {
  async up(db) {
    // Get superadmin
    const superUser = await db.collection('users').findOne({ simpleId: getSuperAdminUsername() });
    let privileges = [];

    // Create system forms
    for (let i = 0; i < systemForms.length; i++) {
      const foundForm = await db.collection('forms').findOne({ simpleId: systemForms[i].simpleId });
      if (!foundForm) {
        // Add super user as the creator and owner (owner is important)
        systemForms[i].created.user = superUser._id;
        systemForms[i].owner = superUser._id;

        privileges = [...privileges, ...systemForms[i].privileges];
        delete systemForms[i].privileges;

        await db.collection('forms').insertOne(systemForms[i]);
      }
    }

    // Create system forms canUse privilege
    for (let i = 0; i < privileges.length; i++) {
      const foundCanUseForm = await db
        .collection('privileges')
        .findOne({ simpleId: privileges[i].simpleId });
      if (!foundCanUseForm) {
        privileges[i].edited = [];
        privileges[i].systemDocument = true;
        privileges[i].privilegeViewAccess = {
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        };
        privileges[i].privilegeEditAccess = {
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        };
        await db.collection('privileges').insertOne(privileges[i]);
      }
    }
  },

  async down(db) {
    let privileges = [];
    for (let i = 0; i < systemForms.length; i++) {
      privileges = [...privileges, ...systemForms[i].privileges];
      await db.collection('forms').deleteOne({ simpleId: systemForms[i].simpleId });
    }
    for (let i = 0; i < privileges.length; i++) {
      await db.collection('privileges').deleteOne({ simpleId: privileges[i].simpleId });
    }
  },
};

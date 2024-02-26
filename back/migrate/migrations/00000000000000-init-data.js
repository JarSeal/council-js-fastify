const {
  getSuperAdminUsername,
  getSuperAdminPassword,
  getSuperAdminEmail,
} = require('../data/utils');
const systemGroups = require('../data/system-groups');
const getSystemForms = require('../data/system-forms');
const { encryptData } = require('../../dist/back/src/core/config');
const getEmails = require('../data/system-emails');

module.exports = {
  // UP
  // **********************************************
  async up(db) {
    const timeNow = new Date();

    // Create superadmin
    await db.collection('users').insertOne({
      simpleId: getSuperAdminUsername(),
      emails: [
        {
          email: getSuperAdminEmail(),
          verified: true,
          added: timeNow,
        },
      ],
      passwordHash: await getSuperAdminPassword(),
      created: {
        user: null,
        publicForm: false,
        date: timeNow,
      },
      edited: [],
      systemDocument: true,
      security: {
        forcePassChange: false,
        loginAttempts: 0,
        coolDownStarted: null,
        isUnderCoolDown: false,
        lastLoginAttempts: [],
        lastLogins: [],
      },
    });
    // Get superadmin
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
        systemGroups[i].members = [superUser._id];
        await db.collection('groups').insertOne(systemGroups[i]);
      }
    }

    // Create system forms
    let privileges = [];
    const systemForms = await getSystemForms(db);
    for (let i = 0; i < systemForms.length; i++) {
      const foundForm = await db.collection('forms').findOne({ simpleId: systemForms[i].simpleId });
      if (!foundForm) {
        // Add super user as the creator and owner
        systemForms[i].created.user = superUser._id;
        systemForms[i].owner = superUser._id;

        privileges = [...privileges, ...systemForms[i].privileges];
        delete systemForms[i].privileges;

        if (systemForms[i].form?.formElems) {
          const elems = systemForms[i].form.formElems;
          for (let j = 0; j < elems.length; j++) {
            // Set orderNr
            elems[j].orderNr = j;

            // @TODO: add a check to compare formElem options and default value (throw error if defaultValue not in options)

            // Encrypt secrets
            if (elems[j].elemType === 'inputSecret') {
              if (!elems[j].elemData) elems[j].elemData = {};
              elems[j].elemData.defaultValue = encryptData(elems[j].elemData.defaultValue);
            }
          }
        }

        await db.collection('forms').insertOne(systemForms[i]);
      }
    }

    // Create system forms canUseForm privilege
    for (let i = 0; i < privileges.length; i++) {
      const foundCanUseForm = await db
        .collection('privileges')
        .findOne({ simpleId: privileges[i].simpleId });
      if (!foundCanUseForm) {
        privileges[i].edited = [];
        privileges[i].systemDocument = true;
        privileges[i].privilegeViewAccess = {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        };
        privileges[i].privilegeEditAccess = {
          public: 'false',
          requireCsrfHeader: true,
          users: [],
          groups: [],
          excludeUsers: [],
          excludeGroups: [],
        };
        await db.collection('privileges').insertOne(privileges[i]);
      }
    }

    // Create system emails
    const emails = getEmails();
    for (let i = 0; i < emails.length; i++) {
      const foundEmail = await db.collection('emails').findOne({ simpleId: emails[i].simpleId });
      if (foundEmail) continue;
      emails[i].edited = [];
      emails[i].systemDocument = [];
      emails[i].created = {
        user: superUser._id,
        date: timeNow,
      };
      await db.collection('emails').insertOne(emails[i]);
    }
  },

  // DOWN (in reverse order)
  // **********************************************
  async down(db) {
    // Remove system emails
    const emails = getEmails();
    for (let i = 0; i < emails.length; i++) {
      await db.collection('emails').deleteOne({ simpleId: emails[i].simpleId });
    }

    // Remove system forms
    let privileges = [];
    const systemForms = await getSystemForms(db);
    for (let i = 0; i < systemForms.length; i++) {
      privileges = [...privileges, ...systemForms[i].privileges];
      await db.collection('forms').deleteOne({ simpleId: systemForms[i].simpleId });
    }
    for (let i = 0; i < privileges.length; i++) {
      await db.collection('privileges').deleteOne({ simpleId: privileges[i].simpleId });
    }

    // Remove system groups
    for (let i = 0; i < systemGroups.length; i++) {
      await db.collection('groups').deleteOne({ simpleId: systemGroups[i].simpleId });
    }

    // Remove superadmin
    await db.collection('users').deleteOne({ simpleId: getSuperAdminUsername() });
  },
};

import DBUserModel, { type DBUser } from '../../src/dbModels/user';
import {
  getSuperAdminPassword,
  getSuperAdminEmail,
  getSuperAdminUsername,
  connectMongoose,
  disconnectMongoose,
} from '../data/utils';
import systemGroups from '../data/system-groups';
import DBGroupModel, { type DBGroup } from '../../src/dbModels/group';
import getSystemForms, { type MigrationPrivilege } from '../data/system-forms';
import DBFormModel, { type DBForm } from '../../src/dbModels/form';
import { encryptData } from '../../src/core/config';
import { FormElem } from '../../src/dbModels/_modelTypePartials';
import DBPrivilegeModel from '../../src/dbModels/privilege';

// UP
// **********************************************
export async function up(): Promise<void> {
  await connectMongoose();
  const timeNow = new Date();

  let superAdmin = await DBUserModel.findOne<DBUser>({ simpleId: getSuperAdminUsername() });

  // Create superadmin
  if (!superAdmin) {
    const user = new DBUserModel<DBUser>({
      simpleId: getSuperAdminUsername(),
      emails: [
        {
          email: getSuperAdminEmail(),
          verified: true,
          added: timeNow,
          token: {},
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
        lastLogins: [],
        lastLoginAttempts: [],
        twoFA: { code: null, date: null, resendDate: null },
      },
    });
    try {
      await user.save();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`Saving superadmin failed`, err);
    }
  }

  // Get superadmin
  superAdmin = (await DBUserModel.findOne<DBUser>({ simpleId: getSuperAdminUsername() })) || null;
  const superAdminId = superAdmin?._id || null;
  if (!superAdmin || !superAdminId) {
    throw new Error('Could not find superAdmin user.');
  }

  // Create system groups
  for (let i = 0; i < systemGroups.length; i++) {
    const foundGroup = await DBGroupModel.findOne<DBGroup>({ simpleId: systemGroups[i].simpleId });
    const group = systemGroups[i];
    if (!foundGroup && group) {
      // Add super user as the creator and owner (owner is important)
      group.created.user = superAdminId;
      group.owner = superAdminId;
      group.members = superAdmin._id ? [superAdmin._id] : [];
      if (group.systemDocument === undefined) group.systemDocument = true;
      const newGroup = new DBGroupModel<DBGroup>(group);
      await newGroup.save();
    }
  }

  // Create system forms
  const systemForms = await getSystemForms();
  let privileges: MigrationPrivilege[] = [];
  for (let i = 0; i < systemForms.length; i++) {
    const foundForm = await DBFormModel.findOne<DBForm>({ simpleId: systemForms[i].simpleId });
    if (!foundForm) {
      const form = systemForms[i];
      privileges = [...privileges, ...(form.privileges ? form.privileges : [])];
      delete systemForms[i].privileges;

      // Add super user as the creator and owner
      form.created.user = superAdminId;
      form.owner = superAdminId;

      if (systemForms[i].systemDocument === undefined) systemForms[i].systemDocument = true;

      if (systemForms[i].form?.formElems) {
        const elems = systemForms[i].form.formElems;
        for (let j = 0; j < elems.length; j++) {
          // Set orderNr
          elems[j].orderNr = j;

          // @TODO: add a check to compare formElem options and default value (throw error if defaultValue not in options)

          // Encrypt secrets
          const elem: FormElem = elems[j];
          if (elem?.elemType === 'inputSecret' && elem.elemData?.defaultValue !== undefined) {
            if (!elem.elemData) elem.elemData = {};
            elem.elemData.defaultValue = encryptData(String(elems[j].elemData?.defaultValue));
          }
        }
      }

      const newForm = new DBFormModel(systemForms[i]);
      await newForm.save();
    }
  }

  // // Create system emails
  // const emails = getEmails();
  // for (let i = 0; i < emails.length; i++) {
  //   const foundEmail = await db.collection('emails').findOne({ simpleId: emails[i].simpleId });
  //   if (foundEmail) continue;
  //   emails[i].edited = [];
  //   if (emails[i].systemDocument === undefined) emails[i].systemDocument = true;
  //   emails[i].created = {
  //     user: superUser._id,
  //     date: timeNow,
  //   };
  //   await db.collection('emails').insertOne(emails[i]);
  // }

  // // Create client routes
  // for (let i = 0; i < routes.length; i++) {
  //   if (!routes[i].simpleId || !routes[i].path) {
  //     console.warn('Client route items must have a simpleId and path defined.');
  //     continue;
  //   }
  //   const foundRoute = await db
  //     .collection('clientRoutes')
  //     .findOne({ simpleId: routes[i].simpleId });
  //   if (foundRoute) continue;
  //   routes[i].edited = [];
  //   if (routes[i].systemDocument === undefined) routes[i].systemDocument = true;
  //   routes[i].created = {
  //     user: superUser._id,
  //     date: timeNow,
  //   };
  //   await db.collection('clientRoutes').insertOne(routes[i]);
  // }

  await disconnectMongoose();
}

// DOWN (in reverse order)
// **********************************************
export async function down(): Promise<void> {
  await connectMongoose();

  // // Remove client routes
  // for (let i = 0; i < routes.length; i++) {
  //   await db.collection('clientRoutes').deleteOne({ simpleId: routes[i].simpleId });
  // }

  // // Remove system emails
  // const emails = getEmails();
  // for (let i = 0; i < emails.length; i++) {
  //   await db.collection('emails').deleteOne({ simpleId: emails[i].simpleId });
  // }

  // Remove system forms
  const formIds: string[] = [];
  const formPrivilegeIds: string[] = [];
  const systemForms = await getSystemForms();
  for (let i = 0; i < systemForms.length; i++) {
    const form = systemForms[i];
    formIds.push(form.simpleId);
    const privileges = form.privileges || [];
    for (let j = 0; j < privileges.length; j++) {
      formPrivilegeIds.push(privileges[j].simpleId);
    }
  }
  await DBFormModel.deleteMany({ simpleId: { $in: formIds } });
  await DBPrivilegeModel.deleteMany({ simpleId: { $in: formPrivilegeIds } });

  // Remove system groups
  const groupIds = systemGroups.map((group) => group.simpleId);
  await DBGroupModel.deleteMany({ simpleId: { $in: groupIds } });

  // Remove superadmin
  await DBUserModel.deleteOne({ simpleId: getSuperAdminUsername() });

  await disconnectMongoose();
}

import DBUserModel, { type DBUser } from '../../src/dbModels/user';
import { getSuperAdminPassword } from '../data/utils';
import { getSuperAdminEmail } from '../data/utils';
import { getSuperAdminUsername } from '../data/utils';

// UP
// **********************************************
export async function up(): Promise<void> {
  const timeNow = new Date();

  // Create superadmin
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
    console.log(`Saving superadmin failed: ${JSON.stringify(err)}`);
  }

  // Get superadmin
  const superAdmin = await DBUserModel.findOne<DBUser>({ simpleId: getSuperAdminUsername() });
  console.log('SUPEADMIN', superAdmin);
}

// DOWN (in reverse order)
// **********************************************
export async function down(): Promise<void> {
  // Remove superadmin
  await DBUserModel.deleteOne({ simpleId: getSuperAdminUsername() });
}

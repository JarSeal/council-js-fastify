import { type DBFormData } from '../dbModels/formData';
import DBFormModel, { type DBForm } from '../dbModels/form';
import { DBUserDataModel } from '../dbModels/formData/';
import type { UserData } from './userAndPrivilegeChecks';
import { validateFormDataInput } from './validation';
import DBUserModel, { type DBUser } from '../dbModels/user';

export const getRequiredActionsFromUser = async (userData: UserData) => {
  if (!userData.isSignedIn || !userData.userId) return null;
  const user = await DBUserModel.findOne<DBUser>({ simpleId: userData.userId });
  if (!user) return null;

  const returnObject: {
    userDataMissingOrInvalid?: boolean;
    forcePassChange?: boolean;
    primaryEmailIsUnverified?: boolean;
  } = {};

  // Validate User(Form)Data
  const userDataForm = await DBFormModel.findOne<DBForm>({ simpleId: 'userData' });
  const curData = await DBUserDataModel.findOne<DBFormData>({ 'created.user': userData.userId });
  const error = validateFormDataInput(userDataForm?.form.formElems || [], curData?.data || []);
  if (error) returnObject.userDataMissingOrInvalid = true;

  // Validate mandatory pass change
  if (user.security.forcePassChange) returnObject.forcePassChange = true;

  // Validate email verification
  if (!user.emails[0].verified) returnObject.primaryEmailIsUnverified = true;

  return Object.keys(returnObject).length ? returnObject : null;
};

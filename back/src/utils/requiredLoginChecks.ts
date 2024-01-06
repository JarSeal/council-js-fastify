import { type DBFormData } from '../dbModels/formData';
import DBFormModel, { type DBForm } from '../dbModels/form';
import { DBUserDataModel } from '../dbModels/formData/';
import type { UserData } from './userAndPrivilegeChecks';
import { validateFormDataInput } from './validation';

export const getRequiredActionsFromUser = async (userData: UserData) => {
  if (!userData.isSignedIn || !userData.userId) return null;
  const returnObject: { userDataMissingOrInvalid?: boolean } = {};

  // Validate UserData
  const userDataForm = await DBFormModel.findOne<DBForm>({ simpleId: 'userData' });
  const formElems = userDataForm?.form.formElems || [];
  const curData = await DBUserDataModel.findOne<DBFormData>({ 'created.user': userData.userId });
  const error = validateFormDataInput(formElems, curData?.data || []);
  if (error) returnObject.userDataMissingOrInvalid = true;

  // Validate email verification
  // Validate mandatory pass change

  return Object.keys(returnObject).length ? returnObject : null;
};

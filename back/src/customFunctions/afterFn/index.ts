import type { DBForm } from '../../dbModels/form';
import type { BasicPrivilegeProps, TransText } from '../../dbModels/_modelTypePartials';
import type { UserData } from '../../utils/userAndPrivilegeChecks';

type CustomAfterFn = {
  [key: string]: {
    name: TransText;
    description: TransText;
    privileges?: BasicPrivilegeProps;
    afterFn: (dataId: string | string[] | undefined, form: DBForm, userData: UserData) => boolean;
  };
};

export const afterFns: CustomAfterFn = {};

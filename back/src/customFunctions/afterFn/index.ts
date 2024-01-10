import type { BasicPrivilegeProps, TransText } from '../../dbModels/_modelTypePartials';
import type { UserData } from '../../utils/userAndPrivilegeChecks';

type CustomAfterFn = {
  [key: string]: {
    name: TransText;
    description: TransText;
    privileges?: BasicPrivilegeProps;
    afterFn: (data: unknown, userData: UserData) => boolean;
  };
};

export const customValidators: CustomAfterFn = {};

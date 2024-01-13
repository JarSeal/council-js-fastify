import type { FastifyRequest } from 'fastify';

import type { DBForm } from '../../dbModels/form';
import type { TransText } from '../../dbModels/_modelTypePartials';
import type { UserData } from '../../utils/userAndPrivilegeChecks';
import { checkAndSetRequiredActions } from './checkAndSetRequiredActions';

export type CustomAfterFn = {
  name: TransText;
  description: TransText;
  afterFn: (
    dataId: string | string[] | undefined,
    form: DBForm,
    userData: UserData,
    req: FastifyRequest
  ) => void;
};

export const afterFns: { [key: string]: CustomAfterFn } = {
  checkAndSetRequiredActions,
};

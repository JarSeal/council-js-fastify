import type { FastifyError, FastifyRequest } from 'fastify';

import type { DBForm } from '../../dbModels/form.js';
import type { TransText } from '../../dbModels/_modelTypePartials.js';
import type { UserData } from '../../utils/userAndPrivilegeChecks.js';
import { checkAndSetRequiredActions } from './checkAndSetRequiredActions.js';

export type AfterFnsProps = {
  dataId: string | string[] | undefined;
  form: DBForm;
  userData: UserData;
  req: FastifyRequest;
};

export type CustomAfterFn = {
  name: TransText;
  description: TransText;
  afterFn: (props: AfterFnsProps) => Promise<{ ok: boolean; error?: FastifyError }>;
};

export const afterFns: { [key: string]: CustomAfterFn } = {
  checkAndSetRequiredActions,
};

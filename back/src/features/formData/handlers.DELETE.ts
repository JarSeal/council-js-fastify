import type { RouteHandler } from 'fastify';

import type { FormDataDeleteRoute } from './routes';
import { getUserData } from '../../utils/userAndPrivilegeChecks';
import { isCsrfGood } from '../../hooks/csrf';

export const formDataDelete: RouteHandler<FormDataDeleteRoute> = async (req, res) => {
  // Get CSRF result
  const csrfIsGood = isCsrfGood(req);

  // Get user data
  const userData = await getUserData(req);

  // Get dataId query param(s)
  const { dataId } = req.query;

  console.log('HERE', csrfIsGood, userData, dataId);

  return res.send({ ok: true });
};

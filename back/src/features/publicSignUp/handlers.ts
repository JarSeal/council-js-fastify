import type { RouteHandler } from 'fastify';

import type { PublicSignUpRoute } from './schemas';
import { validatePublicSignupBody } from '../utils/validation';

export const publicSignUp: RouteHandler<PublicSignUpRoute> = async (req, res) => {
  const body = req.body;
  const validate = validatePublicSignupBody(body);
  req.log.info(JSON.stringify(body));
  if (validate.error) {
    return res.status(validate.status).send({ ok: false, error: validate });
  }
  return res.status(200).send({ ok: true });
};

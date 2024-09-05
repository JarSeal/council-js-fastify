import type { FastifyReply, FastifyRequest } from 'fastify';

import { errors } from '../core/errors.js';
import { getRequiredActions } from '../utils/requiredLoginChecks.js';

export const signedInHook = async (req: FastifyRequest, res: FastifyReply) => {
  if (!req.session.isSignedIn) {
    return res.send(new errors.UNAUTHORIZED('Must be signed in'));
  }
  // Check required actions
  const requiredActions = await getRequiredActions(req);
  if (requiredActions !== null) {
    return res.send(
      new errors.REQUIRED_ACTIONS_ERR(
        `required actions: ${JSON.stringify(requiredActions)}, url "${req.url}"`
      )
    );
  }
  return Promise.resolve();
};

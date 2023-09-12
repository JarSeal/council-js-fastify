import type { FastifyReply, FastifyRequest } from 'fastify';

import { csrfCheck } from './csrf';

export const csrfAndAuthorizationHook = async (req: FastifyRequest, res: FastifyReply) => {
  const csrfError = csrfCheck(req);
  if (csrfError) {
    return res.send(csrfError);
  }

  const method = req.method;
  if (method === 'POST') {
    console.log('REQUEST METHOOD', req.method);
    const body = req.body as { formId: string };
    if (!body?.formId) {
      // Return 404 (maybe)
    }
  }
  // @TODO: add authorization check
  return Promise.resolve();
};

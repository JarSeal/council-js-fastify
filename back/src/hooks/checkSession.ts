import type { FastifyReply, FastifyRequest } from 'fastify';

export const checkSessionHook = async (req: FastifyRequest, _res: FastifyReply) => {
  if (req.session.isSignedIn === undefined) {
    // @TODO: reload session from session store

    // Create new session
    req.session.isSignedIn = false;
  }
  return Promise.resolve();
};

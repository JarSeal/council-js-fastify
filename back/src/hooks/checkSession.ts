import type { FastifyReply, FastifyRequest } from 'fastify';

export const checkSessionHook = async (req: FastifyRequest, _res: FastifyReply) => {
  if (req.session.isSignedIn === undefined) {
    // Try to reload session from session store
    await req.session.reload();

    if (req.session.isSignedIn === undefined) {
      // Create new session
      req.session.isSignedIn = false;
      delete req.session.username;
    }
  }
  return Promise.resolve();
};

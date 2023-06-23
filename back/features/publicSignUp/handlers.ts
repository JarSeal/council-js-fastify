import type { RouteHandler } from 'fastify';

export const publicSignUp: RouteHandler = async (_, res) => res.status(200).send({ ok: true });

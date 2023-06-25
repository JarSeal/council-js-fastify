import type { RouteHandler } from 'fastify';
// import { Mongoose } from 'mongoose';

export const publicSignUp: RouteHandler = async (_, res) => res.status(200).send({ ok: true });

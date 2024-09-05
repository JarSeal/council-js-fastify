// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fastify from 'fastify';

import type { Session as SessionType } from '../dbModels/session.js';

declare module 'fastify' {
  interface Session extends SessionType, Session {}
}

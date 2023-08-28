// eslint-disable-next-line @typescript-eslint/no-unused-vars
import fastify from 'fastify';

declare module 'fastify' {
  interface Session {
    isSignedIn: boolean;
    username?: string;
  }
}

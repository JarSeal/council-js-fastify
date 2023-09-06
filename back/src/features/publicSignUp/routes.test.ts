import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import type { PublicSignUpRoute } from './schemas';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import { getTimestamp, getTimestampFromDate } from '../utils/timeAndDate';

describe('publicSignUp', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should fail the publicSignUp without proper payload', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body must be object');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username: 'myusername' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'email'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { email: 'my.email@server.com' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'username'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { email: 'my.email@server.com', username: 'myusername' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'pass'");
  });

  it('should fail the publicSignUp with invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username: 'myusername', pass: 'somepass', email: 'not_email' },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/email must match format "email"');
  });

  it('should successfully register a new user', async () => {
    const username = 'myusername';
    const pass = 'somepass';
    const email = 'myusername@somedomain.nl';
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username, pass, email },
    });
    const timeNow = getTimestamp();
    const body = JSON.parse(response.body) as PublicSignUpRoute['Body'];
    expect(body).toStrictEqual({ ok: true });

    const user = await DBUserModel.findOne<DBUser>({ simpleId: username });
    expect(user?.simpleId).toBe(username);
    expect(user?.emails[0].email).toBe(email);
    expect(user?.emails[0].verified).toBeFalsy();
    expect(user?.emails[0].token).toBeTruthy();
    expect(user?.emails[0].added).toBeTruthy();
    expect(getTimestampFromDate(user?.emails[0].added || new Date()) > timeNow - 3).toBeTruthy();
    expect(getTimestampFromDate(user?.emails[0].added || new Date()) < timeNow + 3).toBeTruthy();
    expect(user?.passwordHash).toBeTruthy();
    expect(user?.created.publicForm).toBeTruthy();
    expect(user?.created.date).toBeTruthy();
    expect(getTimestampFromDate(user?.created.date || new Date()) > timeNow - 3).toBeTruthy();
    expect(getTimestampFromDate(user?.created.date || new Date()) < timeNow + 3).toBeTruthy();
  });
});

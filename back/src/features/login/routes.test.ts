import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import { getConfig } from '../../core/config';

const validAgentId = '726616f4bb878fab94f1f1dbc8c6ed79';

describe('login and logout', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  const createUser = async (username?: string, email?: string, pass?: string) => {
    if (!username) username = 'myusername';
    if (!email) email = 'aa@aa.com';
    if (!pass) pass = 'mypassword';
    await app.inject({
      method: 'POST',
      path: '/api/v1/publicsignup',
      body: { username, pass, email },
    });
    return { username, pass, email };
  };

  it('should fail the login without proper payload', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body must be object');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { usernameOrEmail: 'myusername' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'pass'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { pass: 'mypassword' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'usernameOrEmail'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { usernameOrEmail: 'myusername', pass: 'mypassword' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'loginMethod'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: { usernameOrEmail: 'myusername', pass: 'mypassword', loginMethod: 'username' },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'agentId'");
  });

  it('should fail the login with invalid payload values', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'mypassword',
        loginMethod: 'username',
        agentId: '',
      },
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/agentId must NOT have fewer than 32 characters');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'mypassword',
        loginMethod: 'username',
        agentId: '726616f4bb878fab94f1f1dbc8c6ed79_45',
      },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/agentId must NOT have more than 32 characters');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'mypassword',
        loginMethod: 'unknown',
        agentId: validAgentId,
      },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual(
      'body/loginMethod must be equal to constant, body/loginMethod must be equal to constant, body/loginMethod must match a schema in anyOf'
    );

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'mypassword',
        loginMethod: 'username',
        agentId: validAgentId,
      },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('LOGIN_USER_OR_PASS_WRONG');
    expect(body.message).toEqual('Password or username wrong');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/login',
      body: {
        usernameOrEmail: 'myusername',
        pass: 'mypassword',
        loginMethod: 'email',
        agentId: validAgentId,
      },
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('LOGIN_USER_OR_PASS_WRONG');
    expect(body.message).toEqual('Password or email wrong');
  });

  it('should set the user to a cooldown period when giving wrong password too many times', async () => {
    const user = await createUser();
    let response;
    for (let i = 0; i < getConfig<number>('user.maxLoginAttempts'); i++) {
      response = await app.inject({
        method: 'POST',
        path: '/api/v1/login',
        body: {
          usernameOrEmail: user.username,
          pass: 'wrongpassword',
          loginMethod: 'username',
          agentId: validAgentId,
        },
      });
    }
    const body = JSON.parse(response?.body || '') as FastifyError;
    expect(response?.statusCode).toBe(401);
    expect(body.code).toEqual('LOGIN_USER_UNDER_COOLDOWN');
    expect(
      body.message.startsWith('User is under cooldown, login denied (loginAttempts:')
    ).toBeTruthy();
  });

  // @TODO: add a successfull login with username and email
});

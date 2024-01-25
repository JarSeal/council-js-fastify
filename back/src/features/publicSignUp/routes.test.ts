import type { FastifyError, FastifyInstance } from 'fastify';
import mongoose from 'mongoose';

import initApp from '../../core/app';
import type { PublicSignUpRoute, Reply } from './schemas';
import DBUserModel, { type DBUser } from '../../dbModels/user';
import { getTimestamp, getTimestampFromDate } from '../../utils/timeAndDate';
import { createForm, csrfHeader } from '../../test/utils';
import { simpleIdRegExp } from '../../utils/validation';

const createPublicSignUpForm = async () =>
  await createForm(
    'publicSignUp',
    '/api/v1/sys/public-signup',
    [
      {
        elemId: 'username',
        orderNr: 0,
        elemType: 'inputText',
        valueType: 'string',
        elemData: {
          minLength: 2,
          maxLength: 32,
        },
        label: { langKey: 'Username' },
        required: true,
        validationRegExp: { pattern: simpleIdRegExp[0], flags: simpleIdRegExp[1] },
        inputErrors: [
          {
            errorId: 'validationRegExp',
            message: {
              langKey: 'Invalid input, only letters (a-z), numbers, "-", and "_" are allowed.',
            },
          },
        ],
      },
      {
        elemId: 'email',
        orderNr: 1,
        elemType: 'inputText',
        valueType: 'string',
        elemData: { email: true },
        label: { langKey: 'E-mail' },
        required: true,
        mustMatchValue: 'emailAgain',
        inputErrors: [
          {
            errorId: 'mustMatchValue',
            message: { langKey: 'E-mails do not match' },
          },
        ],
      },
      {
        elemId: 'emailAgain',
        orderNr: 2,
        elemType: 'inputText',
        valueType: 'string',
        elemData: { email: true },
        label: { langKey: 'E-mail again' },
        required: true,
        mustMatchValue: 'email',
        inputErrors: [
          {
            errorId: 'mustMatchValue',
          },
        ],
      },
      {
        elemId: 'pass',
        orderNr: 3,
        elemType: 'inputText',
        valueType: 'string',
        elemData: {
          password: true,
          minLength: 8,
          maxLength: 128,
        },
        label: { langKey: 'Password' },
        required: true,
        validationRegExp: {
          pattern: '^(?=.*[a-zäöå])(?=.*[A-ZÄÖÅ])(?=.*[0-9])(?=.*[!@#$%^&*])(?=.{8,})',
        },
        mustMatchValue: 'passAgain',
        inputErrors: [
          {
            errorId: 'validationRegExp',
            message: {
              langKey:
                'Password must contain at least: lower and upper case, number, special character (!#$%&?@* )',
            },
          },
          {
            errorId: 'mustMatchValue',
            message: { langKey: 'Passwords do not match' },
          },
        ],
      },
      {
        elemId: 'passAgain',
        orderNr: 4,
        elemType: 'inputText',
        valueType: 'string',
        elemData: { password: true },
        label: { langKey: 'Password again' },
        required: true,
        mustMatchValue: 'pass',
        inputErrors: [
          {
            errorId: 'mustMatchValue',
          },
        ],
      },
    ],
    []
  );

describe('publicSignUp', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await initApp();
    await createPublicSignUpForm();
  });

  afterAll(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('should fail without the CSRF header', async () => {
    const username = 'myusername';
    const pass = 'somepass';
    const email = 'myusername@somedomain.nl';
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: { username, pass, email },
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(401);
    expect(body.code).toEqual('UNAUTHORIZED');
    expect(body.message).toEqual('CSRF-header is invalid or missing');
  });

  it('should fail the publicSignUp without proper payload', async () => {
    let response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      ...csrfHeader,
    });
    let body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body must be object');

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: { username: 'myusername' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'email'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: { email: 'my.email@server.com' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'username'");

    response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: { email: 'my.email@server.com', emailAgain: '', username: 'myusername' },
      ...csrfHeader,
    });
    body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual("body must have required property 'pass'");
  });

  it('should fail the publicSignUp with invalid email', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: {
        username: 'myusername',
        pass: 'somepass',
        passAgain: '',
        email: 'not_email',
        emailAgain: '',
      },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as FastifyError;
    expect(response.statusCode).toBe(400);
    expect(body.code).toEqual('FST_ERR_VALIDATION');
    expect(body.message).toEqual('body/email must match format "email"');
  });

  it('should fail the publicSignUp with too short username', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: {
        username: 's',
        pass: 'somepass',
        passAgain: 'somepass',
        email: 'aa@aa.aa',
        emailAgain: 'aa@aa.aa',
      },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as Reply;
    expect(response.statusCode).toBe(400);
    expect(body.ok).toBeFalsy();
    expect(body.error?.errorId).toBe('minLength');
    expect(body.error?.elemId).toBe('username');
    expect(body.error?.message).toBe("ElemId 'username' value is too short (minLength: 2).");
  });

  it('should fail the publicSignUp with too short password', async () => {
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: {
        username: 'myusername',
        pass: 's',
        passAgain: 's',
        email: 'aa@aa.aa',
        emailAgain: 'aa@aa.aa',
      },
      ...csrfHeader,
    });
    const body = JSON.parse(response.body) as Reply;
    expect(response.statusCode).toBe(400);
    expect(body.ok).toBeFalsy();
    expect(body.error?.errorId).toBe('validationRegExp');
    expect(body.error?.elemId).toBe('pass');
    expect((body.error?.customError as { langKey: string })?.langKey).toBe(
      'Password must contain at least: lower and upper case, number, special character (!#$%&?@* )'
    );
  });

  it('should successfully register a new user', async () => {
    const username = 'myusername';
    const pass = 'myPa$$word1';
    const email = 'myusername@somedomain.nl';
    const response = await app.inject({
      method: 'POST',
      path: '/api/v1/sys/public-signup',
      body: { username, pass, passAgain: pass, email, emailAgain: email },
      ...csrfHeader,
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

    expect(user?.created.user).toBe(null);
    expect(user?.created.publicForm).toBeTruthy();
    expect(user?.created.date).toBeTruthy();
    expect(getTimestampFromDate(user?.created.date || new Date()) > timeNow - 3).toBeTruthy();
    expect(getTimestampFromDate(user?.created.date || new Date()) < timeNow + 3).toBeTruthy();

    expect(Array.isArray(user?.edited)).toBeTruthy();
    expect(user?.edited).toHaveLength(0);

    expect(user?.systemDocument).toBeFalsy();

    expect(user?.security.forcePassChange).toBeFalsy();
    expect(user?.security.loginAttempts).toBe(0);
    expect(user?.security.coolDownStarted).toBe(null);
    expect(user?.security.isUnderCoolDown).toBeFalsy();
    expect(Array.isArray(user?.security.lastLoginAttempts)).toBeTruthy();
    expect(user?.security.lastLoginAttempts).toHaveLength(0);
    expect(Array.isArray(user?.security.lastLogins)).toBeTruthy();
    expect(user?.security.lastLogins).toHaveLength(0);
  });
});

import type { FastifyRequest } from 'fastify';
import mongoose, { Types } from 'mongoose';

import { isPrivBlocked, getUserData } from './userAndPrivilegeChecks';
import { closeDB, initDB } from '../core/db';
import { createGroup, createSysAdmin, createSysDocuments, createUser } from '../test/utils';
import type { AllPrivilegeProps } from '../dbModels/_modelTypePartials';
import { isCsrfGood } from '../hooks/csrf';
import { CSRF_HEADER_NAME, CSRF_HEADER_VALUE } from '../core/config';

const dummyUserId = new Types.ObjectId();

describe('userAndPrivilegeChecks', () => {
  beforeAll(async () => {
    await initDB();
    await createSysDocuments();
  });

  afterAll(async () => {
    await mongoose.connection.db.dropDatabase();
    await closeDB();
  });

  it('should get user data from request', async () => {
    // Get userData
    // ***********************************
    let req = {} as FastifyRequest;
    let userData = await getUserData(req);
    expect(userData).toStrictEqual({
      isSignedIn: false,
      userId: null,
      userGroups: [],
      isSysAdmin: false,
      requiredActions: null,
    });

    req = {
      session: { isSignedIn: true, userId: dummyUserId },
    } as FastifyRequest;
    userData = await getUserData(req);
    expect(userData).toStrictEqual({
      isSignedIn: true,
      userId: dummyUserId,
      userGroups: [],
      isSysAdmin: false,
      requiredActions: null,
    });

    const adminId = await createSysAdmin();
    const adminGroupId = await createGroup('sysAdmins');
    req = {
      session: { isSignedIn: true, userId: adminId },
    } as FastifyRequest;
    userData = await getUserData(req);
    expect(userData).toStrictEqual({
      isSignedIn: true,
      userId: adminId,
      userGroups: [adminGroupId],
      isSysAdmin: true,
      requiredActions: null,
    });

    const basicUsersGroupId = await createGroup('basicUsers');
    const userId = await createUser('testuser1', { groupIds: [basicUsersGroupId] });
    req = {
      session: { isSignedIn: true, userId: userId },
    } as FastifyRequest;
    userData = await getUserData(req);
    expect(userData).toStrictEqual({
      isSignedIn: true,
      userId: userId,
      userGroups: [basicUsersGroupId],
      isSysAdmin: false,
      requiredActions: null,
    });
  });

  it('should check privilege: CSRF and public', async () => {
    // CSRF and public check
    // ***********************************
    let req = {} as FastifyRequest;
    let userData = await getUserData(req);
    let privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    let privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(401);
    expect(privBlocked?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'true' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(401);
    expect(privBlocked?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(401);
    expect(privBlocked?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'onlyPublic' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(401);
    expect(privBlocked?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'true', requireCsrfHeader: false } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);

    req = { headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } } as unknown as FastifyRequest;
    userData = await getUserData(req);
    privilege = { public: 'true' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);

    privilege = { public: 'onlyPublic' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);

    privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(401);
    expect(privBlocked?.message).toBe('Must be signed in');

    req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: 'superadmin',
        userId: await createSysAdmin(),
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    userData = await getUserData(req);
    privilege = { public: 'true' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);

    privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);

    privilege = { public: 'onlyPublic' } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(400);
    expect(privBlocked?.message).toBe('Cannot be signed in to access route');
  });

  it('should check privilege: sysAdmin', async () => {
    // sysAdmin check
    // ***********************************
    const adminId = await createSysAdmin();
    const req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: 'superadmin',
        userId: adminId,
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    const userData = await getUserData(req);
    const privilege = { public: 'false', excludeUsers: [adminId] } as Partial<AllPrivilegeProps>;
    const privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);
  });

  it('should check privilege: owner', async () => {
    // owner check
    // ***********************************
    const userId = await createUser('myuser');
    const owner = userId;
    const req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: 'myuser',
        userId,
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    const userData = await getUserData(req);
    const privilege = { public: 'false', excludeUsers: [userId] } as Partial<AllPrivilegeProps>;
    const privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req), owner);
    expect(privBlocked).toBe(null);
  });

  it('should check included users', async () => {
    const username = 'myusername';
    const userId = await createUser(username, { verified: true });
    const req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: username,
        userId,
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    const userData = await getUserData(req);

    let privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    let privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('No privileges');

    privilege = { public: 'false', users: [new Types.ObjectId()] } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('No privileges');

    privilege = { public: 'false', users: [userId] } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);
  });

  it('should check included groups', async () => {
    const username = 'myusername';
    const userId = await createUser(username, { verified: true });
    const adminId = await createSysAdmin();
    const groupId = await createGroup('mygroup', adminId, [userId]);
    const req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: username,
        userId,
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    const userData = await getUserData(req);

    let privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    let privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('No privileges');

    privilege = { public: 'false', groups: [new Types.ObjectId()] } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('No privileges');

    privilege = { public: 'false', groups: [groupId] } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);
  });

  it('should reject excluded user', async () => {
    const username = 'myusername';
    const userId = await createUser(username, { verified: true });
    const req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: username,
        userId,
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    const userData = await getUserData(req);

    let privilege = {
      public: 'false',
      users: [userId],
      excludeUsers: [userId],
    } as Partial<AllPrivilegeProps>;
    let privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('User in excluded users');

    privilege = {
      public: 'false',
      users: [userId],
      excludeUsers: [],
    } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);
  });

  it('should reject when user belongs to an excluded group', async () => {
    const username = 'myusername';
    const userId = await createUser(username, { verified: true });
    const adminId = await createSysAdmin();
    const groupId = await createGroup('mygroup', adminId, [userId]);
    const req = {
      headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE },
      session: {
        isSignedIn: true,
        username: username,
        userId,
        agentId: '',
        cookie: {},
      },
    } as unknown as FastifyRequest;
    const userData = await getUserData(req);

    let privilege = {
      public: 'false',
      users: [userId],
      excludeGroups: [groupId],
    } as Partial<AllPrivilegeProps>;
    let privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('User in excluded group');

    privilege = {
      public: 'false',
      groups: [groupId],
      excludeGroups: [groupId],
    } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked?.statusCode).toBe(403);
    expect(privBlocked?.message).toBe('User in excluded group');

    privilege = {
      public: 'false',
      groups: [groupId],
      excludeGroups: [],
    } as Partial<AllPrivilegeProps>;
    privBlocked = isPrivBlocked(privilege, userData, isCsrfGood(req));
    expect(privBlocked).toBe(null);
  });
});

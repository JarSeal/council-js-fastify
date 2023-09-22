import type { FastifyRequest } from 'fastify';
import mongoose, { Types } from 'mongoose';

import { checkPrivilege, getUserData } from './userAndPrivilegeChecks';
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
    let req = {} as FastifyRequest;
    let userData = await getUserData(req);
    expect(userData).toStrictEqual({
      isSignedIn: false,
      userId: null,
      userGroups: [],
      isSysAdmin: false,
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
    });
  });

  it('should check privilegde: CSRF and public', async () => {
    // CSRF and public check
    // ***********************************
    let req = {} as FastifyRequest;
    let userData = await getUserData(req);
    let privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    let isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(401);
    expect(isPrivOk?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'true' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(401);
    expect(isPrivOk?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(401);
    expect(isPrivOk?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'onlySignedIn' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(401);
    expect(isPrivOk?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'onlyPublic' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(401);
    expect(isPrivOk?.message).toBe('CSRF-header is invalid or missing');

    privilege = { public: 'true', requireCsrfHeader: false } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    req = { headers: { [CSRF_HEADER_NAME]: CSRF_HEADER_VALUE } } as unknown as FastifyRequest;
    userData = await getUserData(req);
    privilege = { public: 'true' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    privilege = { public: 'onlyPublic' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(401);
    expect(isPrivOk?.message).toBe('Must be signed in');

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
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    privilege = { public: 'onlySignedIn' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    privilege = { public: 'false' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    privilege = { public: 'onlyPublic' } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk?.statusCode).toBe(400);
    expect(isPrivOk?.message).toBe('Cannot be signed in to access route');
  });

  it('should check privilegde: sysAdmin', async () => {
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
    let privilege = { public: 'false', excludeUsers: [adminId] } as Partial<AllPrivilegeProps>;
    let isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);

    privilege = { public: 'onlySignedIn', excludeUsers: [adminId] } as Partial<AllPrivilegeProps>;
    isPrivOk = checkPrivilege(privilege, userData, isCsrfGood(req));
    expect(isPrivOk).toBe(null);
  });
});

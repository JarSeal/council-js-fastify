import type { FastifyInstance, FastifyRequest } from 'fastify';
import mongoose, { Types } from 'mongoose';

import { getRequiredActions, getRequiredActionsFromUser } from './requiredLoginChecks';
import type { UserData } from './userAndPrivilegeChecks';
import { createUser } from '../test/utils';
import initApp from '../core/app';

describe('requiredLoginChecks', () => {
  let app: FastifyInstance;

  beforeEach(async () => {
    app = await initApp();
  });

  afterEach(async () => {
    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('getRequiredActionsFromUser', async () => {
    const userId1 = null;
    const userId2 = await createUser('myusername1');
    const userId3 = await createUser('myusername2', { verified: true });
    const userId4 = await createUser('myusername3', { forcePassChange: true });
    const userData1: UserData = {
      isSignedIn: false,
      userId: userId1,
      userGroups: [],
      isSysAdmin: false,
      lang: 'en',
      requiredActions: null,
    };
    const result1 = await getRequiredActionsFromUser(userData1);
    expect(result1).toBe(null);

    const userData2: UserData = {
      isSignedIn: true,
      userId: userId2,
      userGroups: [],
      isSysAdmin: false,
      lang: 'en',
      requiredActions: null,
    };
    const result2 = await getRequiredActionsFromUser(userData2);
    expect(result2).toStrictEqual({ primaryEmailIsUnverified: true });

    const userData3: UserData = {
      isSignedIn: true,
      userId: userId3,
      userGroups: [],
      isSysAdmin: false,
      lang: 'en',
      requiredActions: null,
    };
    const result3 = await getRequiredActionsFromUser(userData3);
    expect(result3).toBe(null);

    const userData4: UserData = {
      isSignedIn: true,
      userId: userId4,
      userGroups: [],
      isSysAdmin: false,
      lang: 'en',
      requiredActions: null,
    };
    const result4 = await getRequiredActionsFromUser(userData4);
    expect(result4).toStrictEqual({ primaryEmailIsUnverified: true, forcePassChange: true });

    const userData5: UserData = {
      isSignedIn: false,
      userId: userId2,
      userGroups: [],
      isSysAdmin: false,
      lang: 'en',
      requiredActions: null,
    };
    const result5 = await getRequiredActionsFromUser(userData5);
    expect(result5).toBe(null);

    const userData6: UserData = {
      isSignedIn: true,
      userId: new Types.ObjectId(),
      userGroups: [],
      isSysAdmin: false,
      lang: 'en',
      requiredActions: null,
    };
    const result6 = await getRequiredActionsFromUser(userData6);
    expect(result6).toBe(null);
  });

  it('getRequiredActions', async () => {
    const userId1 = null;
    const userId2 = await createUser('myusername1');
    const userId3 = await createUser('myusername2', { verified: true });
    const userId4 = await createUser('myusername3', { forcePassChange: true });
    const req1 = {
      session: {
        isSignedIn: false,
        userId: userId1,
        userGroups: [],
        isSysAdmin: false,
        requiredActions: null,
      },
    } as unknown as FastifyRequest;
    const result1 = await getRequiredActions(req1);
    expect(result1).toBe(null);

    const req2 = {
      session: {
        isSignedIn: true,
        userId: userId2,
        userGroups: [],
        isSysAdmin: false,
      },
    } as unknown as FastifyRequest;
    const result2 = await getRequiredActions(req2);
    expect(result2).toStrictEqual({ primaryEmailIsUnverified: true });

    const req3 = {
      session: {
        isSignedIn: true,
        userId: userId3,
        userGroups: [],
        isSysAdmin: false,
      },
    } as unknown as FastifyRequest;
    const result3 = await getRequiredActions(req3);
    expect(result3).toBe(null);

    const req4 = {
      session: {
        isSignedIn: true,
        userId: userId4,
        userGroups: [],
        isSysAdmin: false,
      },
    } as unknown as FastifyRequest;
    const result4 = await getRequiredActions(req4);
    expect(result4).toStrictEqual({ forcePassChange: true, primaryEmailIsUnverified: true });

    const req5 = {
      session: {
        isSignedIn: false,
        userId: userId2,
        userGroups: [],
        isSysAdmin: false,
      },
    } as unknown as FastifyRequest;
    const result5 = await getRequiredActions(req5);
    expect(result5).toBe(null);

    const req6 = {
      session: {
        isSignedIn: true,
        userId: new Types.ObjectId(),
        userGroups: [],
        isSysAdmin: false,
      },
    } as unknown as FastifyRequest;
    const result6 = await getRequiredActions(req6);
    expect(result6).toBe(null);

    const req7 = {
      session: {
        isSignedIn: true,
        userId: userId4,
        userGroups: [],
        isSysAdmin: false,
        requiredActions: null,
      },
    } as unknown as FastifyRequest;
    const result7 = await getRequiredActions(req7);
    expect(result7).toBe(null);

    const req8 = {
      session: {
        isSignedIn: true,
        userId: new Types.ObjectId(),
        userGroups: [],
        isSysAdmin: false,
        requiredActions: { primaryEmailIsUnverified: true },
      },
    } as unknown as FastifyRequest;
    const result8 = await getRequiredActions(req8);
    expect(result8).toStrictEqual({ primaryEmailIsUnverified: true });
  });
});

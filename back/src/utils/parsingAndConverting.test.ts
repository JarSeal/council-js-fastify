import mongoose, { Types } from 'mongoose';
import type { FastifyInstance } from 'fastify';

import type { DBForm } from '../dbModels/form';
import {
  addPossibleFillerToElemPrivs,
  addPossibleFillerToMainPrivs,
  convertFormDataPrivilegesForSave,
  convertPrivilegeIdStringsToObjectIds,
  createNewEditedArray,
  getApiPathFromReqUrl,
  getOwnerChangingObject,
  getUserId,
  parseFormDataSortStringFromQueryString,
  parseSearchQuery,
} from './parsingAndConverting';
import type { UserData } from './userAndPrivilegeChecks';
import initApp from '../core/app';
import { createUser } from '../test/utils';
import type { PublicPrivilegeProp } from '../dbModels/_modelTypePartials';

describe('parsingAndConverting', () => {
  it('getApiPathFromReqUrl', () => {
    const apiPath1 = getApiPathFromReqUrl('/api/v1/mypath');
    const apiPath2 = getApiPathFromReqUrl('/api/v1/mypath/with-longer-path');
    expect(apiPath1).toBe('/mypath');
    expect(apiPath2).toBe('/mypath/with-longer-path');
  });

  it('parseFormDataSortStringFromQueryString', () => {
    const form = {
      form: {
        formElems: [
          {
            elemId: 'myelem0',
          },
          {
            elemId: 'myelem1',
          },
          {
            elemId: 'myelem2',
          },
          {
            elemId: 'myelem3',
          },
          {
            elemId: 'myelem4',
          },
        ],
      },
    } as DBForm;

    let sorterString = parseFormDataSortStringFromQueryString(undefined, form);
    expect(sorterString).toBe(undefined);

    sorterString = parseFormDataSortStringFromQueryString([], form);
    expect(sorterString).toBe(undefined);

    sorterString = parseFormDataSortStringFromQueryString(['created'], form);
    expect(sorterString).toBe('created.date');
    sorterString = parseFormDataSortStringFromQueryString(['-created'], form);
    expect(sorterString).toBe('-created.date');
    sorterString = parseFormDataSortStringFromQueryString(['edited'], form);
    expect(sorterString).toBe('edited.0.date');
    sorterString = parseFormDataSortStringFromQueryString(['created', '-edited'], form);
    expect(sorterString).toBe('created.date -edited.0.date');

    sorterString = parseFormDataSortStringFromQueryString(['(myelem0)'], form);
    expect(sorterString).toBe('data.0.value');
    sorterString = parseFormDataSortStringFromQueryString(['-(myelem3)'], form);
    expect(sorterString).toBe('-data.3.value');
    sorterString = parseFormDataSortStringFromQueryString(['-(myelem2)', '(myelem4)'], form);
    expect(sorterString).toBe('-data.2.value data.4.value');

    sorterString = parseFormDataSortStringFromQueryString(['0'], form);
    expect(sorterString).toBe('data.0.value');
    sorterString = parseFormDataSortStringFromQueryString(['-0'], form);
    expect(sorterString).toBe('-data.0.value');
    sorterString = parseFormDataSortStringFromQueryString(['0', '-2'], form);
    expect(sorterString).toBe('data.0.value -data.2.value');

    sorterString = parseFormDataSortStringFromQueryString(['0', '-(myelem3)'], form);
    expect(sorterString).toBe('data.0.value -data.3.value');
    sorterString = parseFormDataSortStringFromQueryString(
      ['0', '-(myelem3)', 'created', 'edited'],
      form
    );
    expect(sorterString).toBe('data.0.value -data.3.value created.date');
    sorterString = parseFormDataSortStringFromQueryString(['0', '-(myelem3)', 'created'], form);
    expect(sorterString).toBe('data.0.value -data.3.value created.date');
    sorterString = parseFormDataSortStringFromQueryString(
      ['0', '-(myelem3)', 'edited', 'created'],
      form
    );
    expect(sorterString).toBe('data.0.value -data.3.value created.date');
  });

  it('parseSearchQuery', async () => {
    const app: FastifyInstance = await initApp();

    const form = {
      form: {
        formElems: [
          {
            elemId: 'myelem0',
            valueType: 'string',
          },
          {
            elemId: 'myelem1',
            valueType: 'string',
          },
          {
            elemId: 'myelem2',
            valueType: 'number',
          },
          {
            elemId: 'myelem4',
            valueType: 'number',
            doNotSave: true,
          },
        ],
      },
    } as DBForm;
    form;

    let s = ['(myelem0):search string'];
    let sOper = undefined;
    let userData: UserData = {
      isSignedIn: false,
      userId: null,
      userGroups: [],
      isSysAdmin: false,
    };
    const csrfIsGood = true;
    let sCase = false;

    // search by elemId
    let query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        $and: [
          {
            $or: [
              {
                hasElemPrivileges: false,
              },
              {
                hasElemPrivileges: false,
              },
              {
                'data.0.privileges.read': { $exists: false },
              },
              {
                $and: [
                  {
                    $or: [
                      { 'data.0.privileges.read.requireCsrfHeader': { $ne: true } },
                      { 'data.0.privileges.read.requireCsrfHeader': true },
                    ],
                  },
                  {
                    $or: [
                      { 'data.0.privileges.read.public': 'true' },
                      { 'data.0.privileges.read.public': 'onlyPublic' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            'data.0.value': {
              $options: 'i',
              $regex: 'search string',
            },
          },
        ],
      },
    ]);

    // search by index
    const query2 = await parseSearchQuery(
      ['0:search string'],
      sOper,
      form,
      userData,
      csrfIsGood,
      sCase
    );
    expect(query).toStrictEqual(query2);

    // search by non-existing elemId and sOper = 'or'
    s = ['(elemNotInForm):search string'];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    // sCase string search
    s = ['(myelem0):search string'];
    sCase = true;
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        $and: [
          {
            $or: [
              {
                hasElemPrivileges: false,
              },
              {
                hasElemPrivileges: false,
              },
              {
                'data.0.privileges.read': { $exists: false },
              },
              {
                $and: [
                  {
                    $or: [
                      { 'data.0.privileges.read.requireCsrfHeader': { $ne: true } },
                      { 'data.0.privileges.read.requireCsrfHeader': true },
                    ],
                  },
                  {
                    $or: [
                      { 'data.0.privileges.read.public': 'true' },
                      { 'data.0.privileges.read.public': 'onlyPublic' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            'data.0.value': {
              $options: '',
              $regex: 'search string',
            },
          },
        ],
      },
    ]);

    // search by two strings from index 0 (myelem0) and 1 (myelem1)
    s = ['0:search string', '1:another'];
    sCase = false;
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        $and: [
          {
            $or: [
              {
                hasElemPrivileges: false,
              },
              {
                hasElemPrivileges: false,
              },
              {
                'data.0.privileges.read': { $exists: false },
              },
              {
                $and: [
                  {
                    $or: [
                      { 'data.0.privileges.read.requireCsrfHeader': { $ne: true } },
                      { 'data.0.privileges.read.requireCsrfHeader': true },
                    ],
                  },
                  {
                    $or: [
                      { 'data.0.privileges.read.public': 'true' },
                      { 'data.0.privileges.read.public': 'onlyPublic' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            'data.0.value': {
              $options: 'i',
              $regex: 'search string',
            },
          },
        ],
      },
      {
        $and: [
          {
            $or: [
              {
                hasElemPrivileges: false,
              },
              {
                hasElemPrivileges: false,
              },
              {
                'data.1.privileges.read': { $exists: false },
              },
              {
                $and: [
                  {
                    $or: [
                      { 'data.1.privileges.read.requireCsrfHeader': { $ne: true } },
                      { 'data.1.privileges.read.requireCsrfHeader': true },
                    ],
                  },
                  {
                    $or: [
                      { 'data.1.privileges.read.public': 'true' },
                      { 'data.1.privileges.read.public': 'onlyPublic' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            'data.1.value': {
              $options: 'i',
              $regex: 'another',
            },
          },
        ],
      },
    ]);

    // search by two strings with sOper = 'or'
    sOper = 'or';
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        $or: [
          {
            $and: [
              {
                $or: [
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    'data.0.privileges.read': { $exists: false },
                  },
                  {
                    $and: [
                      {
                        $or: [
                          { 'data.0.privileges.read.requireCsrfHeader': { $ne: true } },
                          { 'data.0.privileges.read.requireCsrfHeader': true },
                        ],
                      },
                      {
                        $or: [
                          { 'data.0.privileges.read.public': 'true' },
                          { 'data.0.privileges.read.public': 'onlyPublic' },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                'data.0.value': {
                  $options: 'i',
                  $regex: 'search string',
                },
              },
            ],
          },
          {
            $and: [
              {
                $or: [
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    'data.1.privileges.read': { $exists: false },
                  },
                  {
                    $and: [
                      {
                        $or: [
                          { 'data.1.privileges.read.requireCsrfHeader': { $ne: true } },
                          { 'data.1.privileges.read.requireCsrfHeader': true },
                        ],
                      },
                      {
                        $or: [
                          { 'data.1.privileges.read.public': 'true' },
                          { 'data.1.privileges.read.public': 'onlyPublic' },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                'data.1.value': {
                  $options: 'i',
                  $regex: 'another',
                },
              },
            ],
          },
        ],
      },
    ]);

    // search with $all operator
    s = ['$all:search string'];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        $or: [
          {
            $and: [
              {
                $or: [
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    'data.0.privileges.read': { $exists: false },
                  },
                  {
                    $and: [
                      {
                        $or: [
                          { 'data.0.privileges.read.requireCsrfHeader': { $ne: true } },
                          { 'data.0.privileges.read.requireCsrfHeader': true },
                        ],
                      },
                      {
                        $or: [
                          { 'data.0.privileges.read.public': 'true' },
                          { 'data.0.privileges.read.public': 'onlyPublic' },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                'data.0.value': {
                  $options: 'i',
                  $regex: 'search string',
                },
              },
            ],
          },
          {
            $and: [
              {
                $or: [
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    hasElemPrivileges: false,
                  },
                  {
                    'data.1.privileges.read': { $exists: false },
                  },
                  {
                    $and: [
                      {
                        $or: [
                          { 'data.1.privileges.read.requireCsrfHeader': { $ne: true } },
                          { 'data.1.privileges.read.requireCsrfHeader': true },
                        ],
                      },
                      {
                        $or: [
                          { 'data.1.privileges.read.public': 'true' },
                          { 'data.1.privileges.read.public': 'onlyPublic' },
                        ],
                      },
                    ],
                  },
                ],
              },
              {
                'data.1.value': {
                  $options: 'i',
                  $regex: 'search string',
                },
              },
            ],
          },
          { __notFound: true },
        ],
      },
    ]);

    // search a number
    s = ['(myelem2):2'];
    sOper = undefined;
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        $and: [
          {
            $or: [
              {
                hasElemPrivileges: false,
              },
              {
                hasElemPrivileges: false,
              },
              {
                'data.2.privileges.read': { $exists: false },
              },
              {
                $and: [
                  {
                    $or: [
                      { 'data.2.privileges.read.requireCsrfHeader': { $ne: true } },
                      { 'data.2.privileges.read.requireCsrfHeader': true },
                    ],
                  },
                  {
                    $or: [
                      { 'data.2.privileges.read.public': 'true' },
                      { 'data.2.privileges.read.public': 'onlyPublic' },
                    ],
                  },
                ],
              },
            ],
          },
          {
            'data.2.value': 2,
          },
        ],
      },
    ]);

    // created date search
    s = ['created:2023-11-29T00:00:00.000Z', 'created:2023-11-30T00:00:00.000Z'];
    sOper = undefined;
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        'created.date': {
          $gt: '2023-11-29T00:00:00.000Z',
        },
      },
      {
        'created.date': {
          $lt: '2023-11-30T00:00:00.000Z',
        },
      },
    ]);

    // edited date search
    s = ['edited:2023-11-29T00:00:00.000Z', 'edited:2023-11-30T00:00:00.000Z'];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([
      {
        'edited.0.date': {
          $gt: '2023-11-29T00:00:00.000Z',
        },
      },
      {
        'edited.0.date': {
          $lt: '2023-11-30T00:00:00.000Z',
        },
      },
    ]);

    // me as creator search
    s = ['edited:2023-11-29T00:00:00.000Z', 'edited:2023-11-30T00:00:00.000Z'];
    let objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase, true);
    expect(query).toStrictEqual([
      {
        $and: [
          {
            'created.user': objId,
          },
          {
            'edited.0.date': {
              $gt: '2023-11-29T00:00:00.000Z',
            },
          },
          {
            'edited.0.date': {
              $lt: '2023-11-30T00:00:00.000Z',
            },
          },
        ],
      },
    ]);

    // me as owner search
    s = ['edited:2023-11-29T00:00:00.000Z', 'edited:2023-11-30T00:00:00.000Z'];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase, undefined, true);
    expect(query).toStrictEqual([
      {
        $and: [
          {
            owner: objId,
          },
          {
            'edited.0.date': {
              $gt: '2023-11-29T00:00:00.000Z',
            },
          },
          {
            'edited.0.date': {
              $lt: '2023-11-30T00:00:00.000Z',
            },
          },
        ],
      },
    ]);

    // me as editor search
    s = ['edited:2023-11-29T00:00:00.000Z', 'edited:2023-11-30T00:00:00.000Z'];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(
      s,
      sOper,
      form,
      userData,
      csrfIsGood,
      sCase,
      undefined,
      undefined,
      true
    );
    expect(query).toStrictEqual([
      {
        $and: [
          {
            'editor.0.user': objId,
          },
          {
            'edited.0.date': {
              $gt: '2023-11-29T00:00:00.000Z',
            },
          },
          {
            'edited.0.date': {
              $lt: '2023-11-30T00:00:00.000Z',
            },
          },
        ],
      },
    ]);

    const userId = await createUser('myusername');

    // creator search (by username)
    s = ['creator:myusername'];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ 'created.user': userId }]);
    s = ['creator:notexisting'];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    // creator search (by id)
    s = ['creatorId:' + userId.toString()];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ 'created.user': userId }]);
    s = ['creatoriD:' + objId.toString()];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    // owner search (by username)
    s = ['owner:myusername'];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ owner: userId }]);
    s = ['owner:notexisting'];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    // owner search (by id)
    s = ['ownerId:' + userId.toString()];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ owner: userId }]);
    s = ['owneriD:' + objId.toString()];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    // editor search (by username)
    s = ['editor:myusername'];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ 'edited.0.user': userId }]);
    s = ['editor:notexisting'];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    // editor search (by id)
    s = ['editorId:' + userId.toString()];
    objId = new Types.ObjectId();
    userData = {
      isSignedIn: true,
      userId: objId,
      userGroups: [],
      isSysAdmin: false,
    };
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ 'edited.0.user': userId }]);
    s = ['editoriD:' + objId.toString()];
    query = await parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ __notFound: true }]);

    await app.close();
    await mongoose.connection.db.dropDatabase();
    await mongoose.connection.close();
  });

  it('convertFormDataPrivilegesForSave', () => {
    let converted = convertFormDataPrivilegesForSave();
    expect(converted).toBe(null);

    const userId1 = new Types.ObjectId();
    const userId2 = new Types.ObjectId();
    const userId3 = new Types.ObjectId();

    const privs1 = {
      read: {
        public: 'onlyPublic' as PublicPrivilegeProp,
        requireCsrfHeader: true,
        users: [userId1.toString(), userId2.toString()],
        excludeUsers: [userId3.toString()],
      },
    };
    converted = convertFormDataPrivilegesForSave(privs1);
    expect(converted).toStrictEqual({
      read: {
        public: 'onlyPublic',
        requireCsrfHeader: true,
        users: [userId1, userId2],
        excludeUsers: [userId3],
      },
    });

    const privs2 = {
      edit: {
        public: 'false' as PublicPrivilegeProp,
        requireCsrfHeader: true,
        users: [userId1.toString(), userId2.toString()],
        excludeUsers: [userId3.toString()],
      },
      create: {
        public: 'false' as PublicPrivilegeProp,
        requireCsrfHeader: true,
        users: [userId1.toString()],
      },
      delete: {
        public: 'false' as PublicPrivilegeProp,
        requireCsrfHeader: true,
        groups: [userId1.toString(), userId2.toString()],
        excludeGroups: [userId3.toString()],
      },
    };
    converted = convertFormDataPrivilegesForSave(privs2);
    expect(converted).toStrictEqual({
      edit: {
        public: 'false',
        requireCsrfHeader: true,
        users: [userId1, userId2],
        excludeUsers: [userId3],
      },
      create: {
        public: 'false' as PublicPrivilegeProp,
        requireCsrfHeader: true,
        users: [userId1],
      },
      delete: {
        public: 'false' as PublicPrivilegeProp,
        requireCsrfHeader: true,
        groups: [userId1, userId2],
        excludeGroups: [userId3],
      },
    });
  });

  it('convertPrivilegeIdStringsToObjectIds', () => {
    const converted1 = convertFormDataPrivilegesForSave();
    expect(converted1).toBe(null);

    const userId1 = new Types.ObjectId();
    const userId2 = new Types.ObjectId();
    const userId3 = new Types.ObjectId();

    const privs1 = {
      public: 'onlyPublic' as PublicPrivilegeProp,
      requireCsrfHeader: true,
      users: [userId1.toString(), userId2.toString()],
      excludeUsers: [userId3.toString()],
    };
    const converted2 = convertPrivilegeIdStringsToObjectIds(privs1);
    expect(converted2).toStrictEqual({
      public: 'onlyPublic',
      requireCsrfHeader: true,
      users: [userId1, userId2],
      excludeUsers: [userId3],
    });

    const privs2 = {
      public: 'false' as PublicPrivilegeProp,
      requireCsrfHeader: true,
      groups: [userId1.toString(), userId2.toString()],
      excludeGroups: [userId3.toString()],
    };
    const converted3 = convertPrivilegeIdStringsToObjectIds(privs2);
    expect(converted3).toStrictEqual({
      public: 'false',
      requireCsrfHeader: true,
      groups: [userId1, userId2],
      excludeGroups: [userId3],
    });
  });

  it('addPossibleFillerToMainPrivs', () => {
    const userId = new Types.ObjectId();
    const userData = { userId, isSignedIn: true } as UserData;

    const privs1 = { read: { users: [] } };
    const updatedPrivs1 = addPossibleFillerToMainPrivs(['$read.users'], privs1, userData);
    expect(updatedPrivs1).toStrictEqual({ read: { users: [userId] } });
    const privs2 = { read: { excludeUsers: [] } };
    const updatedPrivs2 = addPossibleFillerToMainPrivs(['$read.users'], privs2, userData);
    expect(updatedPrivs2).toStrictEqual({ read: { users: [userId], excludeUsers: [] } });
    const privs3 = { read: { users: [] } };
    const updatedPrivs3 = addPossibleFillerToMainPrivs(
      ['$delete.excludeUsers', '$edit.users'],
      privs3,
      userData
    );
    expect(updatedPrivs3).toStrictEqual({
      read: { users: [] },
      edit: { users: [userId] },
      delete: { excludeUsers: [userId] },
    });
    const privs4 = { read: { users: [] } };
    const updatedPrivs4 = addPossibleFillerToMainPrivs(
      ['notgood.users', 'elemId.read.users'],
      privs4,
      userData
    );
    expect(updatedPrivs4).toStrictEqual({ read: { users: [] } });
    const privs5 = { read: { users: [] } };
    const updatedPrivs5 = addPossibleFillerToMainPrivs(['$read.users'], privs5, {
      userId: null,
    } as UserData);
    expect(updatedPrivs5).toStrictEqual({ read: { users: [] } });
    const privs6 = { read: { users: [] } };
    const updatedPrivs6 = addPossibleFillerToMainPrivs(['$read.users'], privs6, {
      userId,
      isSignedIn: false,
    } as UserData);
    expect(updatedPrivs6).toStrictEqual({ read: { users: [] } });
    const privs7 = { read: { users: [] } };
    const updatedPrivs7 = addPossibleFillerToMainPrivs([], privs7, userData);
    expect(updatedPrivs7).toStrictEqual({ read: { users: [] } });
  });

  it('addPossibleFillerToElemPrivs', () => {
    const userId = new Types.ObjectId();
    const userData = { userId, isSignedIn: true } as UserData;

    const privs1 = null;
    const updatedPrivs1 = addPossibleFillerToElemPrivs(
      ['myElem.read.users'],
      privs1,
      userData,
      'myElem'
    );
    expect(updatedPrivs1).toStrictEqual({ read: { users: [userId] } });
    const privs2 = { read: { excludeUsers: [] } };
    const updatedPrivs2 = addPossibleFillerToElemPrivs(
      ['myElem.read.users'],
      privs2,
      userData,
      'myElem'
    );
    expect(updatedPrivs2).toStrictEqual({ read: { users: [userId], excludeUsers: [] } });
    const privs3 = { read: { users: [] } };
    const updatedPrivs3 = addPossibleFillerToElemPrivs(
      ['myElem.delete.excludeUsers', 'myElem.edit.users', 'myOtherElem.users'],
      privs3,
      userData,
      'myElem'
    );
    expect(updatedPrivs3).toStrictEqual({
      read: { users: [] },
      edit: { users: [userId] },
    });
    const privs4 = { read: { users: [] } };
    const updatedPrivs4 = addPossibleFillerToElemPrivs(
      ['myElem.notgood.users', '$read.users'],
      privs4,
      userData,
      'myElem'
    );
    expect(updatedPrivs4).toStrictEqual({ read: { users: [] } });
    const privs5 = { read: { users: [] } };
    const updatedPrivs5 = addPossibleFillerToElemPrivs(
      ['myElem.read.users'],
      privs5,
      {
        userId: null,
      } as UserData,
      'myElem'
    );
    expect(updatedPrivs5).toStrictEqual({ read: { users: [] } });
    const privs6 = { read: { users: [] } };
    const updatedPrivs6 = addPossibleFillerToElemPrivs(
      ['myElem.read.users'],
      privs6,
      {
        userId,
        isSignedIn: false,
      } as UserData,
      'myElem'
    );
    expect(updatedPrivs6).toStrictEqual({ read: { users: [] } });
    const privs7 = { read: { users: [] } };
    const updatedPrivs7 = addPossibleFillerToElemPrivs([], privs7, userData, 'myElem');
    expect(updatedPrivs7).toStrictEqual({ read: { users: [] } });
  });

  it('createNewEditedArray', () => {
    const userId1 = new Types.ObjectId();
    const userId2 = new Types.ObjectId();
    const userId3 = new Types.ObjectId();
    const now = new Date();
    const date1 = new Date('2023-12-20');
    const date2 = new Date('2023-12-19');
    const date3 = new Date('2023-12-18');
    const oldArray = [
      {
        user: userId1,
        date: date1,
      },
      {
        user: userId1,
        date: date2,
      },
      {
        user: userId1,
        date: date3,
      },
    ];

    const newArray1 = createNewEditedArray(oldArray, userId2, 10, now);
    expect(newArray1).toHaveLength(4);
    expect(newArray1[0]).toStrictEqual({ user: userId2, date: now });
    expect(newArray1[1]).toStrictEqual({ user: userId1, date: date1 });
    expect(newArray1[2]).toStrictEqual({ user: userId1, date: date2 });
    expect(newArray1[3]).toStrictEqual({ user: userId1, date: date3 });

    const newArray2 = createNewEditedArray(newArray1, userId3, 3, now);
    expect(newArray2).toHaveLength(3);
    expect(newArray2[0]).toStrictEqual({ user: userId3, date: now });
    expect(newArray2[1]).toStrictEqual({ user: userId2, date: now });
    expect(newArray2[2]).toStrictEqual({ user: userId1, date: date1 });
  });

  it('getUserId', () => {
    const user1 = null;
    const user2 = new Types.ObjectId();
    const user3 = { simpleId: 'myusername', _id: new Types.ObjectId() };
    const userId1 = getUserId(user1);
    const userId2 = getUserId(user2);
    const userId3 = getUserId(user3);
    expect(userId1).toBe(null);
    expect(userId2).toBe(user2);
    expect(userId3).toBe(user3._id);
    expect(getUserId()).toBe(null);
  });

  it('getOwnerChangingObject', () => {
    const curOwner1 = null;
    const curOwner2 = new Types.ObjectId();
    const userData1 = {} as UserData;
    const userData2 = { userId: curOwner2 } as UserData;
    const userData3 = { userId: new Types.ObjectId(), isSysAdmin: true } as UserData;
    const newOwner = new Types.ObjectId().toString();

    const obj1 = getOwnerChangingObject(curOwner1, userData2, newOwner);
    expect(obj1).toStrictEqual({});
    const obj2 = getOwnerChangingObject(curOwner2, userData1, newOwner);
    expect(obj2).toStrictEqual({});
    const obj3 = getOwnerChangingObject(curOwner2, userData2);
    expect(obj3).toStrictEqual({});
    const obj4 = getOwnerChangingObject(curOwner2, userData2, newOwner);
    expect(obj4).toStrictEqual({ owner: new Types.ObjectId(newOwner) });
    const obj5 = getOwnerChangingObject(curOwner1, userData3, newOwner);
    expect(obj5).toStrictEqual({ owner: new Types.ObjectId(newOwner) });
    const obj6 = getOwnerChangingObject(curOwner2, userData3, newOwner);
    expect(obj6).toStrictEqual({ owner: new Types.ObjectId(newOwner) });
  });
});

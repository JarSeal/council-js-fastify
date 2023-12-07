import mongoose, { Types } from 'mongoose';
import type { FastifyInstance } from 'fastify';

import type { DBForm } from '../dbModels/form';
import {
  getApiPathFromReqUrl,
  parseFormDataSortStringFromQueryString,
  parseSearchQuery,
} from './parsingAndConverting';
import type { UserData } from './userAndPrivilegeChecks';
import initApp from '../core/app';
import { createUser } from '../test/utils';

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
});

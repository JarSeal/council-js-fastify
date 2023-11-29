import type { DBForm } from '../dbModels/form';
import {
  getApiPathFromReqUrl,
  parseFormDataSortStringFromQueryString,
  parseSearchQuery,
} from './parsingAndConverting';
import type { UserData } from './userAndPrivilegeChecks';

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

  // @TODO: parseSearchQuery
  it('parseSearchQuery', () => {
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
    const userData: UserData = {
      isSignedIn: false,
      userId: null,
      userGroups: [],
      isSysAdmin: false,
    };
    const csrfIsGood = true;
    const sCase = false;

    // search by elemId
    let query = parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
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
    const query2 = parseSearchQuery(['0:search string'], sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual(query2);

    // search by non-existing elemId and sOper = 'or'
    s = ['(elemNotInForm):search string'];
    query = parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
    expect(query).toStrictEqual([{ notFound: true }]);

    // search by two strings from index 0 (myelem0) and 1 (myelem1)
    s = ['0:search string', '1:another'];
    query = parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
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
    query = parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
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
    query = parseSearchQuery(s, sOper, form, userData, csrfIsGood, sCase);
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
        ],
      },
    ]);

    // search a number
    // created date search
    // edited date search
  });
});

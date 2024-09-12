import {
  isObjectIdOrHexString,
  Types,
  type PaginateResult,
  type Types as MongooseTypes,
} from 'mongoose';
import { hash } from 'bcrypt';

import { apiVersion } from '../core/apis.js';
import { apiRoot } from '../core/app.js';
import type { DBForm } from '../dbModels/form.js';
import DBUserModel from '../dbModels/user.js';
import { getFormDataElemPrivilegesQuery, type UserData } from './userAndPrivilegeChecks.js';
import type {
  AllPrivilegeProps,
  AllPrivilegePropsAsStringIds,
  Edited,
  FormDataPrivileges,
  FormDataPrivilegesAsStringIds,
  UserId,
} from '../dbModels/_modelTypePartials.js';
import { getConfig, getSysSetting, HASH_SALT_ROUNDS } from '../core/config.js';

export const getApiPathFromReqUrl = (reqUrl: string) =>
  reqUrl.split('?')[0].replace(apiRoot + apiVersion, '');

export type PaginationData = {
  totalCount: number;
  limit: number;
  offset: number;
  page: number | undefined;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
};

export const createPaginationPayload = <T>(
  paginationData: PaginateResult<T> | null
): PaginationData | null =>
  paginationData
    ? {
        totalCount: paginationData.totalDocs,
        limit: paginationData.limit,
        offset: paginationData.offset,
        page: paginationData.page,
        totalPages: paginationData.totalPages,
        hasNextPage: paginationData.hasNextPage,
        hasPrevPage: paginationData.hasPrevPage,
      }
    : null;

export const parseFormDataSortStringFromQueryString = (
  sortQuery: string | string[] | undefined,
  form: DBForm
) => {
  if (!sortQuery) return undefined;
  const sorts = typeof sortQuery === 'string' ? [sortQuery] : sortQuery;
  const sortStringArray: string[] = [];
  // This is used to mark the first array sorting type (either 'value' or 'edited') array.
  // Otherwise if value and edited sorting is used together, Mongo(ose) will throw an error.
  let arraySortingType = null;
  for (let i = 0; i < sorts.length; i++) {
    const isDescending = sorts[i].startsWith('-');
    const sortString = isDescending ? sorts[i].substring(1) : sorts[i];
    if (sortString.startsWith('(')) {
      // Sort by elemId
      if (arraySortingType === 'edited') continue;
      const elemId = sortString.replace('(', '').replace(')', '');
      const elems = form.form.formElems;
      let index = null;
      for (let j = 0; j < elems.length; j++) {
        if (elemId === elems[j].elemId) {
          index = j;
          break;
        }
      }
      if (index === null) continue;
      sortStringArray.push(`${isDescending ? '-' : ''}data.${index}.value`);
      arraySortingType = 'value';
      continue;
    }
    if (sortString === 'created') {
      // Created date of formData set
      sortStringArray.push(isDescending ? '-' + 'created.date' : 'created.date');
      continue;
    }
    if (sortString === 'edited') {
      // Edited date of formData set
      if (arraySortingType === 'value') continue;
      sortStringArray.push(isDescending ? '-' + 'edited.0.date' : 'edited.0.date');
      arraySortingType = 'edited';
      continue;
    }
    if (!isNaN(Number(sortString))) {
      // Index of element
      if (arraySortingType === 'edited') continue;
      const index = parseInt(sortString);
      sortStringArray.push(`${isDescending ? '-' : ''}data.${index}.value`);
      arraySortingType = 'value';
      continue;
    }
  }
  if (!sortStringArray.length) return undefined;
  return sortStringArray.join(' ');
};

type SearchQuery = (
  | {
      $and: (
        | {
            [key: string]:
              | { $regex: string; $options: string }
              | { $gt: string }
              | { $lt: string }
              | number
              | Types.ObjectId;
          }
        | { $or: { [key: string]: unknown }[] }
      )[];
    }
  | { __notFound: boolean }
  | { 'created.date': { $gt: string } | { $lt: string } }
  | { 'edited.0.date': { $gt: string } | { $lt: string } }
  | { 'created.user': Types.ObjectId | null }
  | { 'edited.0.user': Types.ObjectId | null }
  | { edited: { $size: number } }
  | { owner: Types.ObjectId | null }
)[];

export const parseSearchQuery = async (
  s: string | string[] | undefined,
  sOper: string | undefined,
  form: DBForm,
  userData: UserData,
  csrfIsGood: boolean,
  sCase?: boolean,
  meAsCreator?: boolean,
  meAsOwner?: boolean,
  meAsEditor?: boolean
) => {
  if (!s && !meAsCreator && !meAsOwner) return [];
  let searchQuery: SearchQuery = [];
  const elems = form.form.formElems;
  let fullSearch = false,
    searchTerm = '',
    createdIndex = -1,
    editedIndex = -1;

  if (s) {
    for (let i = 0; i < s.length; i++) {
      let dateSearch: 'created' | 'edited' | null = null;
      let userSearch: 'creator' | 'editor' | 'owner' | null = null;
      const elemIdOrIndex = s[i].split(':')[0];
      searchTerm = s[i].replace(elemIdOrIndex + ':', '');
      if (elemIdOrIndex === '$all') {
        fullSearch = true;
        searchQuery = [];
        // @CONSIDER: this break might be problematic and might not work well together
        // with other searches (dates, user searches)
        break;
      } else if (elemIdOrIndex === 'created') {
        // Created date search
        dateSearch = 'created';
        createdIndex++;
      } else if (elemIdOrIndex === 'edited') {
        // Edited date search (latest edited date)
        dateSearch = 'edited';
        editedIndex++;
      } else if (
        // User search by user._id
        elemIdOrIndex === 'creatorId' ||
        elemIdOrIndex === 'editorId' ||
        elemIdOrIndex === 'ownerId'
      ) {
        if (searchTerm === '$null') {
          if (elemIdOrIndex === 'creatorId') userSearch = 'creator';
          if (elemIdOrIndex === 'editorId') userSearch = 'editor';
          if (elemIdOrIndex === 'ownerId') userSearch = 'owner';
        } else {
          const isObjectId = isObjectIdOrHexString(searchTerm);
          if (isObjectId) {
            if (elemIdOrIndex === 'creatorId') userSearch = 'creator';
            if (elemIdOrIndex === 'editorId') userSearch = 'editor';
            if (elemIdOrIndex === 'ownerId') userSearch = 'owner';
          }
        }
      } else if (
        // User search by username
        elemIdOrIndex === 'creator' ||
        elemIdOrIndex === 'editor' ||
        elemIdOrIndex === 'owner'
      ) {
        if (searchTerm === '$null') {
          if (elemIdOrIndex === 'creator') userSearch = 'creator';
          if (elemIdOrIndex === 'editor') userSearch = 'editor';
          if (elemIdOrIndex === 'owner') userSearch = 'owner';
        } else {
          // Find User._id from DB
          const user = await DBUserModel.findOne({ simpleId: searchTerm }).select('_id');
          if (user) {
            if (elemIdOrIndex === 'creator') userSearch = 'creator';
            if (elemIdOrIndex === 'editor') userSearch = 'editor';
            if (elemIdOrIndex === 'owner') userSearch = 'owner';
            searchTerm = user._id.toString();
          }
        }
      } else if (!elemIdOrIndex) {
        continue;
      }

      let index = null;
      if (elemIdOrIndex.startsWith('(')) {
        // Find the current index of elemId
        const elemId = elemIdOrIndex.replace('(', '').replace(')', '');
        for (let j = 0; j < elems.length; j++) {
          if (elemId === elems[j].elemId) {
            index = j;
            break;
          }
        }
        if (index === null) index = -1;
      } else if (isNaN(Number(elemIdOrIndex))) {
        index = -1;
      } else {
        index = parseInt(elemIdOrIndex);
      }

      let query;
      if (dateSearch) {
        query = getSearchQueryByValueType(
          dateSearch,
          dateSearch === 'created' ? createdIndex : editedIndex,
          searchTerm,
          userData,
          csrfIsGood,
          sCase
        );
      } else if (userSearch) {
        query = getSearchQueryByValueType(userSearch, 0, searchTerm, userData, csrfIsGood, sCase);
      } else {
        const valueType = index === -1 ? '' : elems[index].valueType;
        query = getSearchQueryByValueType(
          valueType,
          index,
          searchTerm,
          userData,
          csrfIsGood,
          sCase
        );
      }
      if (query) searchQuery.push(query);
    }
  }

  if (fullSearch) {
    let elemIndex = 0;
    for (let i = 0; i < elems.length; i++) {
      if (!elems[i].doNotSave) {
        const valueType = elems[i].valueType;
        const query = getSearchQueryByValueType(
          valueType,
          elemIndex,
          searchTerm,
          userData,
          csrfIsGood,
          sCase
        );
        if (query) searchQuery.push(query);
        elemIndex++;
      }
    }
  }

  const meQuery = [];
  if (meAsCreator && userData.userId) {
    meQuery.push({ 'created.user': userData.userId });
  }
  if (meAsOwner && userData.userId) {
    meQuery.push({ owner: userData.userId });
  }
  if (meAsEditor && userData.userId) {
    meQuery.push({ 'editor.0.user': userData.userId });
  }

  let orQuery = null;
  if (sOper === 'or' || (fullSearch && sOper !== 'and')) {
    orQuery = { $or: searchQuery };
  }
  if (meQuery.length) {
    return [{ $and: [...meQuery, ...(orQuery ? [orQuery] : searchQuery)] }];
  }
  return orQuery ? [orQuery] : searchQuery;
};

const getSearchQueryByValueType = (
  valueType: string,
  index: number,
  searchTerm: string,
  userData: UserData,
  csrfIsGood: boolean,
  sCase?: boolean
) => {
  if (index === -1) return { __notFound: true };
  const currentElemReadPrivs = `data.${index}.privileges.read`;
  const elemPrivsCheck = getFormDataElemPrivilegesQuery(currentElemReadPrivs, userData, csrfIsGood);
  switch (valueType) {
    case 'number':
      if (isNaN(Number(searchTerm))) return { __notFound: true };
      return { $and: [elemPrivsCheck, { [`data.${index}.value`]: Number(searchTerm) }] };
    case 'created':
      return { 'created.date': index % 2 === 0 ? { $gt: searchTerm } : { $lt: searchTerm } };
    case 'edited':
      return { 'edited.0.date': index % 2 === 0 ? { $gt: searchTerm } : { $lt: searchTerm } };
    case 'creator':
      return { 'created.user': searchTerm === '$null' ? null : new Types.ObjectId(searchTerm) };
    case 'editor':
      return searchTerm === '$null'
        ? { edited: { $size: 0 } }
        : { 'edited.0.user': new Types.ObjectId(searchTerm) };
    case 'owner':
      return { owner: searchTerm === '$null' ? null : new Types.ObjectId(searchTerm) };
    case 'string':
    default:
      return {
        $and: [
          elemPrivsCheck,
          { [`data.${index}.value`]: { $regex: searchTerm, $options: sCase ? '' : 'i' } },
        ],
      };
  }
};

export const convertFormDataPrivilegesForSave = (
  privileges?: Partial<FormDataPrivilegesAsStringIds>
) => {
  if (!privileges) return null;

  const convertedPrivileges: Partial<FormDataPrivileges> = {};

  if (privileges.read) {
    const newPrivs = convertPrivilegeIdStringsToObjectIds(privileges.read);
    if (newPrivs) convertedPrivileges.read = newPrivs;
  }
  if (privileges.edit) {
    const newPrivs = convertPrivilegeIdStringsToObjectIds(privileges.edit);
    if (newPrivs) convertedPrivileges.edit = newPrivs;
  }
  if (privileges.create) {
    const newPrivs = convertPrivilegeIdStringsToObjectIds(privileges.create);
    if (newPrivs) convertedPrivileges.create = newPrivs;
  }
  if (privileges.delete) {
    const newPrivs = convertPrivilegeIdStringsToObjectIds(privileges.delete);
    if (newPrivs) convertedPrivileges.delete = newPrivs;
  }

  return Object.keys(convertedPrivileges).length ? convertedPrivileges : null;
};

export const convertPrivilegeIdStringsToObjectIds = (privilege?: AllPrivilegePropsAsStringIds) => {
  if (!privilege) return null;

  const convertedPrivilege: Partial<AllPrivilegeProps> = {
    ...(privilege.public ? { public: privilege.public || 'false' } : {}),
    ...(privilege.requireCsrfHeader !== undefined
      ? { requireCsrfHeader: privilege.requireCsrfHeader || true }
      : {}),
  };

  if (privilege.users) {
    convertedPrivilege.users = [];
    for (let i = 0; i < privilege.users.length; i++) {
      convertedPrivilege.users.push(new Types.ObjectId(privilege.users[i]));
    }
  }
  if (privilege.groups) {
    convertedPrivilege.groups = [];
    for (let i = 0; i < privilege.groups.length; i++) {
      convertedPrivilege.groups.push(new Types.ObjectId(privilege.groups[i]));
    }
  }
  if (privilege.excludeUsers) {
    convertedPrivilege.excludeUsers = [];
    for (let i = 0; i < privilege.excludeUsers.length; i++) {
      convertedPrivilege.excludeUsers.push(new Types.ObjectId(privilege.excludeUsers[i]));
    }
  }
  if (privilege.excludeGroups) {
    convertedPrivilege.excludeGroups = [];
    for (let i = 0; i < privilege.excludeGroups.length; i++) {
      convertedPrivilege.excludeGroups.push(new Types.ObjectId(privilege.excludeGroups[i]));
    }
  }

  return Object.keys(convertedPrivilege).length ? convertedPrivilege : null;
};

export const addPossibleFillerToMainPrivs = (
  fillerRules: string[],
  mainPrivs: Partial<FormDataPrivileges>,
  userData: UserData
) => {
  // Adds filler to mainPrivileges
  if (!fillerRules.length || !userData.isSignedIn || !userData.userId) {
    return mainPrivs;
  }
  for (let i = 0; i < fillerRules.length; i++) {
    const splitRule = fillerRules[i].split('.');
    let action: 'read' | 'edit' | 'delete' | null = null;
    if (splitRule[0] === '$read') action = 'read';
    if (splitRule[0] === '$edit') action = 'edit';
    if (splitRule[0] === '$delete') action = 'delete';
    if (action && splitRule.length === 2) {
      const privSlot: 'users' | 'excludeUsers' | null =
        splitRule[1] === 'users' || splitRule[1] === 'excludeUsers' ? splitRule[1] : null;
      const userId = userData.userId;
      if (privSlot && mainPrivs[action]) {
        const curPrivilegeAction = mainPrivs[action];
        // @NOTE: Typescript cannot see for some reason that
        // 'curPrivilegeAction' nor 'array' cannot be undefined!! (hence the checks)
        if (curPrivilegeAction && Array.isArray(curPrivilegeAction[privSlot])) {
          const array = curPrivilegeAction[privSlot];
          if (array && !array.includes(userId)) array.push(userId);
        } else if (curPrivilegeAction) {
          curPrivilegeAction[privSlot] = [userId];
        }
      } else if (privSlot) {
        mainPrivs[action] = { [privSlot]: [userId] };
      }
    }
  }
  return mainPrivs;
};

export const addPossibleFillerToElemPrivs = (
  fillerRules: string[],
  elemPrivs: Partial<FormDataPrivileges> | null,
  userData: UserData,
  elemId: string
) => {
  // Adds filler to mainPrivileges
  if (!fillerRules.length || !userData.isSignedIn || !userData.userId) {
    return elemPrivs;
  }
  for (let i = 0; i < fillerRules.length; i++) {
    const splitRule = fillerRules[i].split('.');
    if (splitRule[0] !== elemId) continue;
    let action: 'read' | 'edit' | null = null;
    if (splitRule[1] === 'read') action = 'read';
    if (splitRule[1] === 'edit') action = 'edit';
    if (action && splitRule.length === 3) {
      const privSlot: 'users' | 'excludeUsers' | null =
        splitRule[2] === 'users' || splitRule[2] === 'excludeUsers' ? splitRule[2] : null;
      const userId = userData.userId;
      if (privSlot && elemPrivs && elemPrivs[action]) {
        const curPrivilegeAction = elemPrivs[action];
        // @NOTE: Typescript cannot see for some reason that
        // 'curPrivilegeAction' nor 'array' cannot be undefined!! (hence the checks)
        if (curPrivilegeAction && Array.isArray(curPrivilegeAction[privSlot])) {
          const array = curPrivilegeAction[privSlot];
          if (array && !array.includes(userId)) array.push(userId);
        } else if (curPrivilegeAction) {
          curPrivilegeAction[privSlot] = [userId];
        }
      } else if (privSlot) {
        if (!elemPrivs) elemPrivs = {};
        elemPrivs[action] = { [privSlot]: [userId] };
      }
    }
  }
  return elemPrivs;
};

export const createNewEditedArray = async (
  oldArray: Edited[],
  userId: MongooseTypes.ObjectId | null,
  count?: number,
  forcedDate?: Date
) => {
  const defaultCount = await getSysSetting<number>('defaultEditedLogs');
  const COUNT =
    (count !== undefined ? count : null) ||
    (defaultCount !== undefined
      ? defaultCount
      : getConfig<number>('security.defaultEditedLogs', 5));
  const date = forcedDate || new Date();
  const oldArrayCopy = [...oldArray];
  oldArrayCopy.unshift({ user: userId, date });
  const newArray = oldArrayCopy.filter((_, index) => index < COUNT);
  return newArray;
};

export const getUserId = (userId?: UserId) => {
  if (!userId) return null;
  if ('_id' in userId) return userId._id;
  if (isObjectIdOrHexString(userId)) return userId;
  return null;
};

export const getOwnerChangingObject = (curOwner: UserId, userData: UserData, newOwner?: string) => {
  const curOwnerId = getUserId(curOwner);
  if (!newOwner || !userData.userId || (!curOwnerId && !userData.isSysAdmin)) return {};
  if ((curOwnerId && curOwnerId.equals(userData.userId)) || userData.isSysAdmin) {
    return { owner: new Types.ObjectId(newOwner) };
  }
  return {};
};

export const hashString = async (str: string) => await hash(str, HASH_SALT_ROUNDS);

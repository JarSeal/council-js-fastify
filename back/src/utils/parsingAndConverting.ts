import type { PaginateResult } from 'mongoose';

import { apiVersion } from '../core/apis';
import { apiRoot } from '../core/app';
import type { DBForm } from '../dbModels/form';
import { getFormDataElemPrivilegesQuery, type UserData } from './userAndPrivilegeChecks';

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
              | number;
          }
        | { $or: { [key: string]: unknown }[] }
      )[];
    }
  | { $notFound: boolean }
  | { 'created.date': { $gt: string } | { $lt: string } }
  | { 'edited.0.date': { $gt: string } | { $lt: string } }
)[];

export const parseSearchQuery = (
  s: string | string[] | undefined,
  sOper: string | undefined,
  form: DBForm,
  userData: UserData,
  csrfIsGood: boolean,
  sCase?: boolean
) => {
  if (!s) return [];
  let searchQuery: SearchQuery = [];
  const elems = form.form.formElems;
  let fullSearch = false,
    searchTerm = '',
    createdIndex = -1,
    editedIndex = -1;

  for (let i = 0; i < s.length; i++) {
    let dateSearch = null;
    const elemIdOrIndex = s[i].split(':')[0];
    searchTerm = s[i].replace(elemIdOrIndex + ':', '');
    if (elemIdOrIndex === '$all') {
      fullSearch = true;
      searchQuery = [];
      break;
    }
    if (elemIdOrIndex === 'created') {
      dateSearch = 'created';
      createdIndex++;
    }
    if (elemIdOrIndex === 'edited') {
      dateSearch = 'edited';
      editedIndex++;
    }
    if (!elemIdOrIndex) continue;

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
    } else {
      const valueType = index === -1 ? '' : elems[index].valueType;
      query = getSearchQueryByValueType(valueType, index, searchTerm, userData, csrfIsGood, sCase);
    }
    if (query) searchQuery.push(query);
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

  if (sOper === 'or' || (fullSearch && sOper !== 'and')) return [{ $or: searchQuery }];
  return searchQuery;
};

const getSearchQueryByValueType = (
  valueType: string,
  index: number,
  searchTerm: string,
  userData: UserData,
  csrfIsGood: boolean,
  sCase?: boolean
) => {
  if (index === -1) return { $notFound: true };
  const currentElemReadPrivs = `data.${index}.privileges.read`;
  const elemPrivsCheck = getFormDataElemPrivilegesQuery(currentElemReadPrivs, userData, csrfIsGood);
  switch (valueType) {
    case 'number':
      if (isNaN(Number(searchTerm))) return { $notFound: true };
      return { $and: [elemPrivsCheck, { [`data.${index}.value`]: Number(searchTerm) }] };
    case 'created':
      return { 'created.date': index % 2 === 0 ? { $gt: searchTerm } : { $lt: searchTerm } };
    case 'edited':
      return { 'edited.0.date': index % 2 === 0 ? { $gt: searchTerm } : { $lt: searchTerm } };
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

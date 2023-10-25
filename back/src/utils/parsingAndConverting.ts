import type { PaginateResult, Types } from 'mongoose';

import { apiVersion } from '../core/apis';
import { apiRoot } from '../core/app';
import type { DBForm } from '../dbModels/form';
import type { UserData } from './userAndPrivilegeChecks';

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

type SearchQuery = {
  $and: (
    | { [key: string]: { $regex: string; $options: string } | number }
    | { $or: { [key: string]: boolean | Types.ObjectId | null }[] }
  )[];
}[];

export const parseSearchQuery = (
  s: string | string[] | undefined,
  sOper: string | undefined,
  form: DBForm,
  userData: UserData
) => {
  if (!s) return [];
  let searchQuery: SearchQuery = [];
  const elems = form.form.formElems;
  let fullSearch = false,
    searchTerm = '';

  for (let i = 0; i < s.length; i++) {
    const elemIdOrIndex = s[i].split(':')[0];
    searchTerm = s[i].replace(elemIdOrIndex + ':', '');
    if (elemIdOrIndex === '$all') {
      fullSearch = true;
      searchQuery = [];
      break;
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
    } else if (isNaN(Number(elemIdOrIndex))) {
      continue;
    } else {
      index = parseInt(elemIdOrIndex);
    }
    if (index === null) continue;

    const valueType = elems[index].valueType;
    const query = getSearchQueryByValueType(valueType, index, searchTerm, userData);
    if (query) searchQuery.push(query);
  }

  if (fullSearch) {
    let elemIndex = 0;
    for (let i = 0; i < elems.length; i++) {
      if (!elems[i].doNotSave) {
        const valueType = elems[i].valueType;
        const query = getSearchQueryByValueType(valueType, elemIndex, searchTerm, userData);
        if (query) searchQuery.push(query);
        elemIndex++;
      }
    }
  }

  if (sOper === 'or') return [{ $or: searchQuery }];
  return searchQuery;
};

const getSearchQueryByValueType = (
  valueType: string,
  index: number,
  searchTerm: string,
  userData: UserData
) => {
  const hasNotElemPrivs: { $or: { [key: string]: boolean | Types.ObjectId | null }[] } = {
    $or: [{ hasElemPrivileges: false }, { hasElemPrivileges: userData.isSysAdmin }],
  };
  if (userData.userId) {
    hasNotElemPrivs.$or.push({ owner: userData.userId });
  }
  switch (valueType) {
    case 'string':
      return {
        $and: [hasNotElemPrivs, { [`data.${index}.value`]: { $regex: searchTerm, $options: 'i' } }],
      };
    case 'number':
      return { $and: [hasNotElemPrivs, { [`data.${index}.value`]: Number(searchTerm) }] };
    default:
      return null;
  }
};

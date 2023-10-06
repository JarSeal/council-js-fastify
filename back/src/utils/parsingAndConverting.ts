import type { PaginateResult } from 'mongoose';

import { apiVersion } from '../core/apis';
import { apiRoot } from '../core/app';

export const getApiPathFromReqUrl = (reqUrl: string) =>
  reqUrl.split('?')[0].replace(apiRoot + apiVersion, '');

export const getPaginationData = <T>(paginationData: PaginateResult<T> | null) =>
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

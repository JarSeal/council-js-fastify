import type { PaginateResult } from 'mongoose';

import { apiVersion } from '../core/apis';
import { apiRoot } from '../core/app';

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

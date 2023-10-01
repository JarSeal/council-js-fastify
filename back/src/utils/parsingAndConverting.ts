import { apiVersion } from '../core/apis';
import { apiRoot } from '../core/app';

export const getApiPathFromReqUrl = (reqUrl: string) =>
  reqUrl.split('?')[0].replace(apiRoot + apiVersion, '');

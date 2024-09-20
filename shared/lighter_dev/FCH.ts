import { IS_SERVER } from './SSR';

export type FCH_Response<R> = {
  data: R;
  statusCode: number;
  errorCode?: string;
  errorMessage?: string;
} | null;

export const FCH = async <R, B>(
  url: string,
  opts?: {
    /** Id for the SSR function in the backend */
    ssrId?: string;
    /** Force to use fetch also in the backend */
    ssrForceFetch?: boolean;
    /** Message body */
    body?: B;
    /** Fetch method ('GET' | 'POST' | 'PUT' | 'DELETE') */
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  }
): Promise<FCH_Response<R>> => {
  if (opts?.ssrId && !opts?.ssrForceFetch && IS_SERVER) {
    // Server side data fetching
    console.log('FCH SERVER', url, opts);
  } else if (opts?.ssrForceFetch || !IS_SERVER) {
    // Client side data fetching (or server side if opts.ssrForceFetch = true)
    const response = await fetch(url);
    const data = await response.json();
    console.log('FCH CLIENT', url, opts, data);
    return {
      data,
      statusCode: response.status,
    };
  } else {
    return null;
  }
  return { data: true as R, statusCode: 200 };
};

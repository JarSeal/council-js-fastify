import { IS_SERVER, setServerFetchData } from './SSR';

export type FCH_Response<R> = {
  data: R;
  statusCode: number;
  errorCode?: string;
  errorMessage?: string;
} | null;

export type FCH_OPTS = {
  /** Force to use fetch also in the backend */
  ssrForceFetch?: boolean;
  /** Message body */
  body?: unknown;
  /** Fetch method ('GET' | 'POST' | 'PUT' | 'DELETE') */
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
};

export const FCH = async <R>(url: string, opts?: FCH_OPTS): Promise<FCH_Response<R>> => {
  if (!opts?.ssrForceFetch && IS_SERVER) {
    // Server side data fetching
    console.log('FCH SERVER', url, opts);
    setServerFetchData(url, opts);
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

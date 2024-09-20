import { CMP, FCH, IS_SERVER } from '@council/shared';

export const fetcherCMP = async () => {
  const response = await FCH('http://localhost:4004/api/v1/sys/healths');
  console.log('SSR STATUS8', response);

  const fetcherCmp = CMP({ text: 'IS_SERVER: ' + JSON.stringify(IS_SERVER) });
  return fetcherCmp;
};

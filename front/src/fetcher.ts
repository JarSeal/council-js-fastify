import { CMP } from '@council/shared';

export const fetcherCMP = async () => {
  // const data = await fetch('http://localhost:4004/api/v1/sys/health');
  // console.log('DATA', data);
  const data = window.ssrParser;
  console.log('SSR STATUS', window.ssrParser);

  const fetcherCmp = CMP({ text: JSON.stringify(data) });
  return fetcherCmp;
};

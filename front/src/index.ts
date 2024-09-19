import { CMP } from '@council/shared';
import { fetcherCMP } from './fetcher';

export const AppCmp = async () => {
  const rootCmp = CMP({
    attach: document?.getElementById('root') || 'ssr',
    id: 'root',
    idAttr: true,
    text: 'CMP7',
  });
  rootCmp.add(await fetcherCMP());

  return rootCmp;
};

document.addEventListener('DOMContentLoaded', () => AppCmp());

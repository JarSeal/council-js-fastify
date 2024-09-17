import { CMP } from '@council/shared';
import { fetcherCMP } from './fetcher';

export {};
declare global {
  interface Window {
    lighterSSR: unknown;
    ssrParser?: boolean;
  }
}

export const AppCmp = async () => {
  const rootCmp = CMP({
    attach: document?.getElementById('root') || 'ssr',
    id: 'root',
    idAttr: true,
    text: 'CMP3',
  });
  rootCmp.add(await fetcherCMP());

  return rootCmp;
};

document.addEventListener('DOMContentLoaded', () => AppCmp());

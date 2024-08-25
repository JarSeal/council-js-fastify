import { CMP } from '@council/shared';

export {};
declare global {
  interface Window {
    lighterSSR: unknown;
  }
}

export const AppCmp = () =>
  CMP({
    attach: document?.getElementById('root') || 'ssr',
    id: 'root',
    idAttr: true,
    text: 'CMP3',
  });

console.log('FRONT END CODE7!', window.lighterSSR);
document.addEventListener('DOMContentLoaded', () => AppCmp());

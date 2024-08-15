export {};

declare global {
  interface Window {
    lighterSSR: unknown;
  }
}

console.log('FRONT END CODE4!', window.lighterSSR);

import { TR } from './LANG';
import type { Route } from './RTR';

// Create metadata
export const ssrMetadata = (curRoute: Route) => {
  const metadata = `<title>${TR(curRoute.meta?.title)}</title>`;
  return metadata;
};

// CSS Stylesheet file link
export const ssrCSSLink = (href: string) =>
  `<link rel="stylesheet" type="text/css" href="${href}" />`;

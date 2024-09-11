// import { JSDOM } from 'jsdom';

import { TR } from './LANG.js';
import type { Route } from './RTR.js';

// Create metadata
export const ssrMetadata = (curRoute: Route) => {
  const metadata = `<title>${TR(curRoute.meta?.title)}</title>`;
  return metadata;
};

// CSS Stylesheet file link
export const ssrCSSLink = (href: string) =>
  `<link rel="stylesheet" type="text/css" href="${href}" />`;

// Get view data
export const ssrGetViewData = () => {
  const html = '<div id="root"></div>';
  return html;
};

export const SSR_RENDER_CONTENT_WRAPPER_ID: string = '__wrapper_id__';
export const ssrRenderContentHtml = async (
  jsParser: (template: string) => Promise<string>,
  jsFileContents: string,
  rootId: string
): Promise<string> => {
  const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <script>${jsFileContents}</script>
  </head>
  <body>
    <div id="${SSR_RENDER_CONTENT_WRAPPER_ID}">
      <div id="${rootId}"></div>
    </div>
  </body>
</html>`;
  const html = await jsParser(htmlTemplate);
  return html;
};

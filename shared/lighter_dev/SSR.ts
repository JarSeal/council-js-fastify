import { TR } from './LNG.js';
import type { Route } from './RTR.js';

export {};
declare global {
  interface Window {
    lighterSSR: unknown;
    ssrParser?: boolean;
  }
}

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

// Determines whether the frontend code is run on server or client3
export const IS_SERVER = typeof window !== 'undefined' ? Boolean(window.ssrParser) : false;

// This is the template for the backend jsDom parserer
export const SSR_RENDER_CONTENT_WRAPPER_ID: string = '__wrapper_id__';
export const ssrRenderContentHtml = async (
  jsParser: (template: string) => Promise<string>,
  jsFileContents: string,
  rootId: string
): Promise<string> => {
  const htmlTemplate = `<!DOCTYPE html>
<html>
  <head>
    <script>self.ssrParser=true;${jsFileContents}</script>
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

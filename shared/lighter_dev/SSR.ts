import { FCH_OPTS } from './FCH.js';
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

// Determines whether the frontend code is run on server or client2
export const IS_SERVER = typeof window !== 'undefined' ? Boolean(window.ssrParser) : false;

// This is the template for the backend jsDom parserer
export const SSR_RENDER_CONTENT_WRAPPER_ID: string = '__wrapper_id__';
export const ssrRenderContentHtml = async (
  jsParser: (template: string, jsFileContents: string) => Promise<string>,
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
  const html = await jsParser(htmlTemplate, jsFileContents);
  return html;
};

export type ServerFetchParams = {
  [key: string]: {
    url: string;
    opts?: FCH_OPTS;
  };
};
export const serverFetchData: ServerFetchParams = {};
export const createServerFetchKey = (url: string, opts?: unknown) =>
  `${url}__${JSON.stringify(opts)}`;
export const setServerFetchData = (url: string, opts?: FCH_OPTS) => {
  const key = createServerFetchKey(url, opts);
  serverFetchData[key] = { url, opts };
};

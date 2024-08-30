import type { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { SSR_RENDER_CONTENT_WRAPPER_ID, ssrRenderContentHtml } from '@council/shared';
import { JSDOM } from 'jsdom';

import { getUserClientRoutes } from '../features/clientRoutes/handlers';
import { getApiPathFromReqUrl } from '../utils/parsingAndConverting';
import { getUserData } from '../utils/userAndPrivilegeChecks';
import { isCsrfGood } from '../hooks/csrf';
import { TR } from '../utils/language';
import { CLIENT_ROOT_ELEM_ID, IS_DEVELOPMENT } from './config';

export const createIndexHtml = async (req: FastifyRequest, res: FastifyReply) => {
  // @TODO: Get language
  const lang = 'en';

  // Get current route path and client route data
  const userData = await getUserData(req);
  const csrfIsGood = isCsrfGood(req);
  const routePath = getApiPathFromReqUrl(req.url);
  const routes = await getUserClientRoutes(userData, csrfIsGood, routePath);

  const ssrObject = { isSSR: true, routes, rootId: 'root' };

  const parser = async (template: string) => {
    const _window = new JSDOM(template, { runScripts: 'dangerously', resources: 'usable' }).window;
    const wrapperElem = _window.document.getElementById(SSR_RENDER_CONTENT_WRAPPER_ID);
    return new Promise<string>((resolve) => {
      _window.onload = () => {
        resolve(wrapperElem?.children?.[0].outerHTML || '');
      };
    });
  };

  let jsTags = '',
    jsTagsSerialized = '',
    cssTags = '',
    ssrHTML = `<div id="${CLIENT_ROOT_ELEM_ID}"></div>`;
  const JS_PATH = path.join(__dirname, '../../dist/public/assets/');

  const query = req.query as { [key: string]: unknown };
  if (IS_DEVELOPMENT && '_ssrDevServer' in query && query._ssrDevServer === 'build') {
    // Development mode

    // Build frontend and copy to back dist
    console.log('Build frontend..');
    const stdout = execSync('yarn --cwd ../ build:front');
    console.log(stdout.toString());

    try {
      jsTags = `<script>self.lighterSSR = ${JSON.stringify(ssrObject)};</script>
    <script type="module" src="./index.ts"></script>`;
      jsTagsSerialized = `self.lighterSSR = ${JSON.stringify(ssrObject)};`;
      const assets = fs.readdirSync(JS_PATH);
      for (let i = 0; i < assets.length; i++) {
        // Check if js files available
        if (assets[i].endsWith('.js')) {
          jsTagsSerialized += fs.readFileSync(`${JS_PATH}${assets[i]}`, 'utf8');
        }
      }
      ssrHTML = await ssrRenderContentHtml(parser, jsTagsSerialized, CLIENT_ROOT_ELEM_ID);
    } catch (err) {
      jsTags =
        'Error: could not locate asset files or an error occurred while reading and/or serializing.';
    }
  } else if (IS_DEVELOPMENT && '_ssrDevServer' in query) {
    // Development mode
    jsTags = `<script>self.lighterSSR = ${JSON.stringify(ssrObject)};</script>
    <script type="module" src="./index.ts"></script>`;
  } else {
    // Build/production mode
    try {
      jsTags = `<script>self.lighterSSR = ${JSON.stringify(ssrObject)};</script>`;
      jsTagsSerialized = `self.lighterSSR = ${JSON.stringify(ssrObject)};`;
      const assets = fs.readdirSync(JS_PATH);
      for (let i = 0; i < assets.length; i++) {
        // Check if js files available
        if (assets[i].endsWith('.js')) {
          jsTags += `<script src="/public/assets/${assets[i]}"></script>\n`;
          jsTagsSerialized += fs.readFileSync(`${JS_PATH}${assets[i]}`, 'utf8');
        }

        // @TODO: Check if css files available
        if (assets[i].endsWith('.css')) {
          cssTags += ``;
        }
      }
    } catch (err) {
      jsTags =
        'Error: could not locate asset files or an error occurred while reading and/or serializing.';
    }
    ssrHTML = await ssrRenderContentHtml(parser, jsTagsSerialized, CLIENT_ROOT_ELEM_ID);
  }

  // @TODO: Create metadata
  const metadata = `<title>${await TR(routes.curRoute.meta?.title)}</title>`;

  return res.type('text/html').send(`<!DOCTYPE html>
<html lang="${lang}">
  <head>
    ${metadata}
    ${cssTags}
  </head>
  <body>
    <h1>${await TR(
      routes.curRoute.meta?.title
    )} <span style="font-size: 16px;">(remove this H1)</span></h1>
    ${ssrHTML}
    ${jsTags}
  </body>
</html>
`);
};

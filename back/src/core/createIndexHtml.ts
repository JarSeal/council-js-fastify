import type { FastifyReply, FastifyRequest } from 'fastify';
import fs from 'fs';
import path from 'path';

import { getUserClientRoutes } from '../features/clientRoutes/handlers';
import { getApiPathFromReqUrl } from '../utils/parsingAndConverting';
import { getUserData } from '../utils/userAndPrivilegeChecks';
import { isCsrfGood } from '../hooks/csrf';
import { TR } from '../utils/language';

export const createIndexHtml = async (req: FastifyRequest, res: FastifyReply) => {
  // @TODO: Get language
  const lang = 'en';

  // Get current route path and client route data
  const userData = await getUserData(req);
  const csrfIsGood = isCsrfGood(req);
  const routePath = getApiPathFromReqUrl(req.url);
  const routes = await getUserClientRoutes(userData, csrfIsGood, routePath);
  console.log('HERE', routes);

  const ssrObject = { isSSR: true, routes, rootId: 'root' };

  let jsTag = '',
    cssTag = '';

  const query = req.query as { [key: string]: unknown };
  if ('_ssrCouncil' in query) {
    jsTag = '<script type="module" src="./index.ts"></script>';
  } else {
    try {
      const JS_PATH = path.join(__dirname, '../../dist/public/assets/');
      const assets = fs.readdirSync(JS_PATH);
      for (let i = 0; i < assets.length; i++) {
        // Check if js file available
        if (assets[i].endsWith('.js')) {
          jsTag = `<script>self.lighterSSR = ${JSON.stringify(ssrObject)};</script>
      <script src="/public/assets/${assets[i]}"></script>`;
        }

        // @TODO: Check if css file available
        if (assets[i].endsWith('.css')) {
          cssTag = ``;
        }
      }
    } catch (err) {
      jsTag = 'Error: could not locate asset files.';
    }
  }

  // @TODO: Create metadata
  const metadata = `<title>${await TR(routes.curRoute.meta?.title)}</title>`;

  return res.type('text/html').send(`<!DOCTYPE html>
<html lang="${lang}">
  <head>
    ${metadata}
    ${cssTag}
  </head>
  <body>
    <h1>${await TR(
      routes.curRoute.meta?.title
    )} <span style="font-size: 16px;">(remove this H1)</span></h1>
    <div id="root"></div>
    ${jsTag}
  </body>
</html>
`);
};

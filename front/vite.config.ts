import { config } from 'dotenv';
import http from 'node:http';
import path from 'node:path';
import { defineConfig } from 'vite';
import { run } from 'vite-plugin-run';
import FullReload from 'vite-plugin-full-reload';

config();

const BACK_BASE_URL = process.env.BACK_BASE_URL || 'http://localhost:4004';
const SSR = process.env.SSR || '1';

export default defineConfig({
  root: './src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    commonjsOptions: {
      transformMixedEsModules: true,
    },
    manifest: true,
    minify: true,
    reportCompressedSize: true,
    rollupOptions: {
      // overwrite default .html entry
      input: path.join(__dirname, 'src/index.ts'),
    },
  },
  server: {
    fs: {
      strict: false,
    },
    proxy: {
      '/api': `${BACK_BASE_URL}/api`,
    },
  },
  plugins: [
    {
      // Disables hot reload because we need to first build and copy front build files to backend
      name: 'Disable hot reload',
      handleHotUpdate: () => [],
    },
    run([
      {
        // Build the front on every front file change (and copy build files to backend)
        startup: false,
        build: false,
        name: 'Build frontend on updates',
        run: ['yarn', 'build'],
        pattern: [path.join(__dirname, '**/*.ts')],
        // eslint-disable-next-line no-console
        onFileChanged: () => console.log('Building front..'),
      },
    ]),
    // Do a full reload when front build files update in backend
    FullReload('dist/public/**/*', { root: path.join(__dirname, '../back/') }),
    {
      // Replaces the index.html output with server version
      name: 'Index html build replacement',
      transformIndexHtml: {
        order: 'pre',
        handler: async (_, ctx) => {
          const getHtmlResult = () =>
            new Promise<string>((resolve, reject) => {
              let path = ctx.originalUrl;
              if (path?.includes('?')) {
                path += `&_ssrDevServer=${SSR}`;
              } else {
                path += `?_ssrDevServer=${SSR}`;
              }
              http.get(`${BACK_BASE_URL}${path}`, (res) => {
                res.setEncoding('utf8');
                res.on('data', function (chunk) {
                  resolve(chunk);
                });
                res.on('error', function (err) {
                  reject(err);
                });
              });
            });
          return await getHtmlResult();
        },
      },
    },
  ],
});

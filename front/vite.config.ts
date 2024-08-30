import { config } from 'dotenv';
import http from 'node:http';
import { defineConfig } from 'vite';

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
      input: './src/index.ts',
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
      name: 'my-plugin-for-index-html-build-replacement',
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

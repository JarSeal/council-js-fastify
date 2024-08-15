import { defineConfig } from 'vite';

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
    // rollupOptions: {
    //   // overwrite default .html entry
    //   input: './src/index.ts',
    // },
  },
  server: {
    fs: {
      strict: false,
    },
  },
  test: {
    root: './',
  },
});

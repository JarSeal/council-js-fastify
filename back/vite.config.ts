import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['**/*.test.ts'],
    exclude: ['db', 'dist', 'node_modules'],
    fileParallelism: false,
  },
});

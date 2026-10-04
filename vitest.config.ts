import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@desktop': path.resolve(import.meta.dirname!, './desktop'),
      '@dashboard': path.resolve(import.meta.dirname!, './dashboard'),
      '@shared': path.resolve(import.meta.dirname!, './desktop/shared'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    globals: false,
  },
});

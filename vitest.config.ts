import { defineConfig } from 'vitest/config';
import path from 'path';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@desktop':   path.resolve(import.meta.dirname!, './desktop'),
      '@dashboard': path.resolve(import.meta.dirname!, './dashboard'),
      '@shared':    path.resolve(import.meta.dirname!, './desktop/shared'),
    },
  },
  test: {
    include: [
      'tests/**/*.test.ts',
      'extension/tests/**/*.test.ts',
      'extension/tests/**/*.test.tsx',
    ],
    globals: true,
    environmentMatchGlobs: [
      ['extension/tests/popup.test.tsx', 'jsdom'],
    ],
    setupFiles: ['./extension/tests/setup.ts'],
  },
});

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@desktop': path.resolve(import.meta.dirname!, './desktop'),
      '@dashboard': path.resolve(import.meta.dirname!, './dashboard'),
      '@shared': path.resolve(import.meta.dirname!, './desktop/shared'),
    },
  },
  root: './dashboard',
  build: {
    outDir: '../dist/dashboard',
    emptyOutDir: true,
  },
});

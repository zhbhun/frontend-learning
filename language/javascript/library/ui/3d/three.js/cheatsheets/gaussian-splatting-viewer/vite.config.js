import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        representationCompare: resolve(__dirname, 'representation-compare.html'),
        sortAndAlpha: resolve(__dirname, 'sort-and-alpha.html'),
        loadingBudget: resolve(__dirname, 'loading-budget.html'),
        viewerIntegration: resolve(__dirname, 'viewer-integration.html')
      }
    }
  }
});

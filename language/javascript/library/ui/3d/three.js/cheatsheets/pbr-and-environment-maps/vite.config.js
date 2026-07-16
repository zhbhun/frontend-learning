import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        standardMaterial: resolve(__dirname, 'standard-material.html'),
        environmentMap: resolve(__dirname, 'environment-map.html'),
        colorManagement: resolve(__dirname, 'color-management.html'),
        physicalMaterial: resolve(__dirname, 'physical-material.html')
      }
    }
  }
});

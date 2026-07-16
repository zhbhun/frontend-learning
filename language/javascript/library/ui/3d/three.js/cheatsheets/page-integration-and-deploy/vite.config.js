import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        responsiveContainer: resolve(__dirname, 'responsive-container.html'),
        domOverlay: resolve(__dirname, 'dom-overlay.html'),
        lifecycleMount: resolve(__dirname, 'lifecycle-mount.html'),
        visibilityPause: resolve(__dirname, 'visibility-pause.html'),
        assetPathsDeploy: resolve(__dirname, 'asset-paths-deploy.html')
      }
    }
  }
});

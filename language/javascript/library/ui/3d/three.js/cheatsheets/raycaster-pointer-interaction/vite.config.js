import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        pointerToNdc: resolve(__dirname, 'pointer-to-ndc.html'),
        hoverHighlight: resolve(__dirname, 'hover-highlight.html'),
        clickSelection: resolve(__dirname, 'click-selection.html'),
        layersFilter: resolve(__dirname, 'layers-filter.html'),
        linePointsThreshold: resolve(__dirname, 'line-points-threshold.html')
      }
    }
  }
});

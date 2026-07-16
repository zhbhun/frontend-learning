import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    // three.js 与两个 controls 由多页面共享；当前压缩前共享 chunk 约 578 kB。
    chunkSizeWarningLimit: 650,
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        transformControls: resolve(__dirname, 'transform-controls.html'),
        selectAndTransform: resolve(__dirname, 'select-and-transform.html')
      }
    }
  }
});

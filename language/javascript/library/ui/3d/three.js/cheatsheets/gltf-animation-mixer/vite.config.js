import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        clipPlayback: resolve(__dirname, 'clip-playback.html'),
        actionControls: resolve(__dirname, 'action-controls.html'),
        crossFade: resolve(__dirname, 'cross-fade.html')
      }
    }
  }
});

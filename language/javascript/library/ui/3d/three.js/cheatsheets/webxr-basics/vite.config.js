import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        sessionCheck: resolve(__dirname, 'session-check.html'),
        vrButtonLoop: resolve(__dirname, 'vr-button-loop.html'),
        controllerInput: resolve(__dirname, 'controller-input.html'),
        xrLifecycle: resolve(__dirname, 'xr-lifecycle.html')
      }
    }
  }
});

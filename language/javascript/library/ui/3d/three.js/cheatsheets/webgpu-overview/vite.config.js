import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        capabilityCheck: resolve(__dirname, 'capability-check.html'),
        rendererInit: resolve(__dirname, 'renderer-init.html'),
        webglWebgpuBoundary: resolve(__dirname, 'webgl-webgpu-boundary.html'),
        nodeMaterialTsl: resolve(__dirname, 'node-material-tsl.html')
      }
    }
  }
});

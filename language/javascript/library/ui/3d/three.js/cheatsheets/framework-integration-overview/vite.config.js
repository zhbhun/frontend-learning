import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        imperativeAdapter: resolve(__dirname, 'imperative-adapter.html'),
        rerenderBoundary: resolve(__dirname, 'rerender-boundary.html'),
        loopOwnership: resolve(__dirname, 'loop-ownership.html'),
        frameworkMap: resolve(__dirname, 'framework-map.html')
      }
    }
  }
});

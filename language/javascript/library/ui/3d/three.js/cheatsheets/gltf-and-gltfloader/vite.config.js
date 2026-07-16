import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        gltfLoader: resolve(__dirname, 'gltf-loader.html'),
        sceneNodes: resolve(__dirname, 'scene-nodes.html'),
        loadingErrors: resolve(__dirname, 'loading-errors.html')
      }
    }
  }
});

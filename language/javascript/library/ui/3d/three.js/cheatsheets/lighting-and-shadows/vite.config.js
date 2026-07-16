import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ambientLight: resolve(__dirname, 'ambient-light.html'),
        hemisphereLight: resolve(__dirname, 'hemisphere-light.html'),
        directionalLight: resolve(__dirname, 'directional-light.html'),
        pointLight: resolve(__dirname, 'point-light.html'),
        spotLight: resolve(__dirname, 'spot-light.html'),
        shadowMap: resolve(__dirname, 'shadow-map.html')
      }
    }
  }
});

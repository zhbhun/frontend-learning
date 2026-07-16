import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        boxGeometry: resolve(__dirname, 'box-geometry.html'),
        sphereGeometry: resolve(__dirname, 'sphere-geometry.html'),
        cylinderGeometry: resolve(__dirname, 'cylinder-geometry.html'),
        planeGeometry: resolve(__dirname, 'plane-geometry.html'),
        torusGeometry: resolve(__dirname, 'torus-geometry.html'),
        bufferAttribute: resolve(__dirname, 'buffer-attribute.html'),
        indexedGeometry: resolve(__dirname, 'indexed-geometry.html')
      }
    }
  }
});

import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        uniformColor: resolve(__dirname, 'uniform-color.html'),
        vertexDisplacement: resolve(__dirname, 'vertex-displacement.html'),
        varyingGradient: resolve(__dirname, 'varying-gradient.html'),
        customAttribute: resolve(__dirname, 'custom-attribute.html'),
        rawMaterialBoundary: resolve(__dirname, 'raw-material-boundary.html')
      }
    }
  }
});

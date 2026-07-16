import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        textureLoader: resolve(__dirname, 'texture-loader.html'),
        canvasTexture: resolve(__dirname, 'canvas-texture.html'),
        dataTexture: resolve(__dirname, 'data-texture.html'),
        colorSpace: resolve(__dirname, 'color-space.html'),
        flipY: resolve(__dirname, 'flip-y.html'),
        uvTransform: resolve(__dirname, 'uv-transform.html'),
        wrappingModes: resolve(__dirname, 'wrapping-modes.html'),
        filtersMipmaps: resolve(__dirname, 'filters-mipmaps.html'),
        materialMapSlots: resolve(__dirname, 'material-map-slots.html')
      }
    }
  }
});

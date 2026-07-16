import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        pointsBuffer: resolve(__dirname, 'points-buffer.html'),
        pointMaterialAlpha: resolve(__dirname, 'point-material-alpha.html'),
        dynamicAttributes: resolve(__dirname, 'dynamic-attributes.html'),
        shaderPoints: resolve(__dirname, 'shader-points.html'),
        instancedParticles: resolve(__dirname, 'instanced-particles.html')
      }
    }
  }
});

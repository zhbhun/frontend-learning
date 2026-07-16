import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        fallingBodies: resolve(__dirname, 'falling-bodies.html'),
        colliderShapes: resolve(__dirname, 'collider-shapes.html'),
        fixedStep: resolve(__dirname, 'fixed-step.html'),
        kinematicControl: resolve(__dirname, 'kinematic-control.html'),
        contactEvents: resolve(__dirname, 'contact-events.html')
      }
    }
  }
});

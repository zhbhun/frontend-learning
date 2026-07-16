import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        timerDelta: resolve(__dirname, 'timer-delta.html'),
        timerStep: resolve(__dirname, 'timer-step.html'),
        fixedStep: resolve(__dirname, 'fixed-step.html')
      }
    }
  }
});

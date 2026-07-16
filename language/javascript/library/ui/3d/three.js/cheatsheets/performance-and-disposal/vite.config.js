import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        renderCost: resolve(__dirname, 'render-cost.html'),
        instancingReuse: resolve(__dirname, 'instancing-reuse.html'),
        textureBudget: resolve(__dirname, 'texture-budget.html'),
        disposeLifecycle: resolve(__dirname, 'dispose-lifecycle.html'),
        onDemandRender: resolve(__dirname, 'on-demand-render.html')
      }
    }
  }
});

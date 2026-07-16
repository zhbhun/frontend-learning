import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        composerChain: resolve(__dirname, 'composer-chain.html'),
        bloomPass: resolve(__dirname, 'bloom-pass.html'),
        outlinePass: resolve(__dirname, 'outline-pass.html'),
        antialiasPass: resolve(__dirname, 'antialias-pass.html')
      }
    }
  }
});

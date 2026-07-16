import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        materialFamily: resolve(__dirname, 'material-family.html'),
        pbrStandard: resolve(__dirname, 'pbr-standard.html'),
        transparencyDepth: resolve(__dirname, 'transparency-depth.html')
      }
    }
  }
});

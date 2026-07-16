import { defineConfig } from 'vite';

const input = {
  index: new URL('./index.html', import.meta.url).pathname,
  viewerShell: new URL('./viewer-shell.html', import.meta.url).pathname,
  autoFrame: new URL('./auto-frame.html', import.meta.url).pathname,
  loadingState: new URL('./loading-state.html', import.meta.url).pathname,
  lightingEnvironment: new URL('./lighting-environment.html', import.meta.url).pathname
};

export default defineConfig({
  server: {
    host: '0.0.0.0'
  },
  preview: {
    host: '0.0.0.0'
  },
  build: {
    rollupOptions: {
      input
    }
  }
});

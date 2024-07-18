import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ['**/*.riv'],
  plugins: [react()],
  server: {
    fs: {
      strict: false,
    },
    host: '0.0.0.0',
  },
});

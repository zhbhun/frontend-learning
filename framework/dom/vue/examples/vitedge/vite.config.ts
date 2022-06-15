import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vitedgePlugin from 'vitedge/plugin.js'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vitedgePlugin(), vue()]
})

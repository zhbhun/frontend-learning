import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import bodyParser from 'body-parser'
import { DocumentManager } from '@y-sweet/sdk'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // 自定义 API 接口（仅开发环境）
    {
      name: 'custom-api',
      configureServer(server) {
        const manager = new DocumentManager('ys://127.0.0.1:8080')
        server.middlewares.use(bodyParser.json())
        server.middlewares.use((req, res, next) => {
          if (req.method === 'POST' && req.url?.startsWith('/api/auth')) {
            const docId =
              (req as typeof req & { body?: { docId?: string } }).body?.docId ??
              null
            if (docId) {
              manager
                .getOrCreateDocAndToken(docId ?? undefined)
                .then((clientToken) => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(clientToken))
                }, next)
              return
            }
          }
          next()
        })
      },
    },
  ],
  optimizeDeps: {
    exclude: ['@y-sweet/client', 'yjs', 'y-websocket'],
  },
})

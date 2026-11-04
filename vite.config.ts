import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const beProxy = env.VITE_BE_PROXY || 'http://localhost:4000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(import.meta.dirname, './src') },
    },
    server: {
      port: 5175,
      strictPort: true,
      // FE gọi /api cùng origin → cookie phiên là first-party, SameSite=Lax là đủ.
      proxy: {
        '/api': { target: beProxy, changeOrigin: true },
      },
    },
  }
})

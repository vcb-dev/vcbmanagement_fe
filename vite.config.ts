import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, type Plugin } from 'vite'
import { VitePWA, type ManifestOptions } from 'vite-plugin-pwa'
import basicSsl from '@vitejs/plugin-basic-ssl'

const phoneHttps = process.env.VITE_DEV_HTTPS === '1'

const manifest: Partial<ManifestOptions> = {
  name: 'VCB Management',
  short_name: 'VCB',
  description: 'Chấm công Viên Chi Bảo',
  theme_color: '#4f46e5',
  background_color: '#ffffff',
  display: 'standalone',
  orientation: 'portrait',
  lang: 'vi',
  start_url: '/',
  scope: '/',
  icons: [
    { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'pwa-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}

/**
 * vite-plugin-pwa chỉ tạo manifest khi build. Server dev mà thiếu manifest thì iPhone "Thêm vào Màn hình chính"
 * tự đoán phạm vi app từ trang đang mở, chuyển sang trang khác (vd /leave-requests) là hiện thanh trình duyệt.
 * Không bật `devOptions` của plugin vì nó đăng ký service worker, trong khi app đang cố ý gỡ service worker.
 */
function devManifest(): Plugin {
  return {
    name: 'vcb-dev-manifest',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/manifest.webmanifest', (_req, res) => {
        res.setHeader('Content-Type', 'application/manifest+json')
        res.end(JSON.stringify(manifest))
      })
    },
    transformIndexHtml: () => [{ tag: 'link', attrs: { rel: 'manifest', href: '/manifest.webmanifest' }, injectTo: 'head' }],
  }
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(phoneHttps ? [basicSsl()] : []),
    devManifest(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: false,
      selfDestroying: true,
      includeAssets: ['favicon.svg', 'apple-touch-icon.png', 'pwa-192.png', 'pwa-512.png'],
      manifest,
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2,woff}'],
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//, /^\/assets\//],
      },
    }),
  ],
  build: {
    target: ['es2020', 'safari15'],
    modulePreload: { polyfill: false },
  },
  resolve: {
    alias: { '@': path.resolve(import.meta.dirname, './src') },
  },
  server: {
    port: 5175,
    strictPort: true,
    host: true,
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})

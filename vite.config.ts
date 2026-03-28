import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'masked-icon.svg', 'logo.png'],
      manifest: {
        name: '退休应用',
        short_name: '退休',
        description: '基于 React + TypeScript + Tailwind CSS 开发的移动端退休应用',
        theme_color: '#ffffff',
        start_url: '/tuixiu/',
        display: 'standalone',
        background_color: '#ffffff',
        scope: '/tuixiu/',
        icons: [
          {
            src: '/tuixiu/logo.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/tuixiu/logo.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/tuixiu/logo.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
      },
    })
  ],
  server: {
    allowedHosts: ['discourageable-gilberte-impeccably.ngrok-free.dev'],
    proxy: {
      '/api/tencent-asr': {
        target: 'https://asr.tencentcloudapi.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/tencent-asr/, '')
      }
    }
  },
  base: '/tuixiu/'
})
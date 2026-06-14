import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache tudo que o Vite emite
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,mjs}'],
        // PDF worker é grande (~1.4MB) — exclui do precache mas deixa via network
        globIgnores: ['**/pdf.worker*'],
        runtimeCaching: [
          {
            // PDF worker: cache-first depois do primeiro download
            urlPattern: /pdf\.worker/,
            handler: 'CacheFirst',
            options: { cacheName: 'pdf-worker', expiration: { maxEntries: 1 } },
          },
        ],
      },
      manifest: {
        name: 'Notas',
        short_name: 'Notas',
        description: 'Caderno digital com caneta, texto e adesivos',
        theme_color: '#4d94e0',
        background_color: '#e8eef6',
        display: 'standalone',
        orientation: 'any',
        start_url: '/',
        scope: '/',
        lang: 'pt-BR',
        icons: [
          {
            src: '/icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
})

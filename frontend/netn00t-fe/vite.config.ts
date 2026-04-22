import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        // Pre-cache all built assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            // ROM artwork: cache aggressively — images don't change between uploads
            urlPattern: /^\/images\//,
            handler: 'CacheFirst',
            options: {
              cacheName: 'rom-images',
              expiration: {
                maxEntries: 500,
                maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // API calls always go to the network — never serve stale ROM lists or upload results
            urlPattern: /^\/api\//,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'NetN00t',
        short_name: 'NetN00t',
        description: 'Web application for netbooting Sega arcade hardware',
        theme_color: '#ff6600',
        background_color: '#121212',
        display: 'standalone',
        icons: [
          {
            src: 'netn00t.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'netn00t.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable',
          },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8080',
      '/images': 'http://localhost:8080',
    },
  },
  build: {
    outDir: 'build',
  },
});

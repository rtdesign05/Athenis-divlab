import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

// Tauri expects a fixed port and uses a different host in dev mode
const isTauri = process.env['TAURI_ENV_TARGET_TRIPLE'] !== undefined

export default defineConfig({
  plugins: [
    react(),
    // PWA is for web deployment only — skip when building for Tauri
    ...(!isTauri ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['logo-athenis.svg', 'apple-touch-icon.png', 'icon-48.png', 'icon-192.png', 'icon-256.png', 'icon-512.png'],
      manifest: false, // we use our own public/manifest.json
      workbox: {
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 5 },
              networkTimeoutSeconds: 10,
            },
          },
        ],
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        skipWaiting: true,
        clientsClaim: true,
      },
      devOptions: {
        enabled: false,
      },
    })] : []),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // Tauri dev server needs cleartext localhost; keep proxy for web dev
  server: {
    port: 5173,
    // Required for Tauri — allow connections from the Tauri WebView
    strictPort: true,
    host: isTauri ? '127.0.0.1' : 'localhost',
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  // Tauri uses ES modules directly from the file system
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    outDir: 'dist',
    // Never ship sourcemaps to production — they expose full source code
    sourcemap: false,
    // Tauri supports modern browsers only — no need for legacy polyfills
    target: isTauri ? ['es2021', 'chrome105', 'safari13'] : 'modules',
    // react-pdf est lourd (1.4 MB) mais chargé dynamiquement uniquement
    // lors de la génération de PDF — pas dans le bundle initial.
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom', 'react-router-dom'],
          query:  ['@tanstack/react-query'],
          pdf:    ['@react-pdf/renderer'],
        },
      },
    },
  },
})

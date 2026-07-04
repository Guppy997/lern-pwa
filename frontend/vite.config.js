import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' statt 'autoUpdate': eine neue Version wird zwar im Hintergrund
      // geladen, aktiviert sich aber erst, wenn der Nutzer im Update-Button
      // klickt (statt beim nächsten Reload unbemerkt zu wechseln).
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['icon-192.png', 'icon-512.png'],
      workbox: {
        // Ohne das bricht die App bei fehlendem Netz komplett weg (nur die
        // Fehlerkarte), obwohl sie als installierte PWA suggeriert, offline
        // nutzbar zu sein. NetworkFirst: zeigt frische Daten wenn der Pi
        // erreichbar ist, sonst den letzten bekannten Stand aus dem Cache.
        runtimeCaching: [
          {
            urlPattern: ({ url, request }) => request.method === 'GET' && url.pathname.startsWith('/api/'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 7 * 24 * 60 * 60 }
            }
          }
        ]
      },
      manifest: {
        name: 'Lern-Sessions',
        short_name: 'Lernen',
        description: 'Tagesplanung, Fokus-Timer und Reflexion fürs Lernen',
        theme_color: '#cd6f4d',
        background_color: '#f3ece1',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    host: true,
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY_TARGET || 'http://localhost:3001',
        changeOrigin: true
      }
    }
  }
});

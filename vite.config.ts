import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [
        react(),
        VitePWA({
          registerType: 'autoUpdate',
          includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
          manifest: {
            name: 'BALAJI PAWN BROKERS - Digital Ledger',
            short_name: 'BalajiLedger',
            description: 'Secure digital ledger for Gold & Silver loans',
            theme_color: '#EAB308',
            background_color: '#f8fafc',
            display: 'standalone',
            orientation: 'portrait',
            icons: [
              {
                src: 'https://cdn-icons-png.flaticon.com/512/2696/2696191.png',
                sizes: '192x192',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/2696/2696191.png',
                sizes: '512x512',
                type: 'image/png'
              },
              {
                src: 'https://cdn-icons-png.flaticon.com/512/2696/2696191.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'any maskable'
              }
            ]
          }
        })
      ],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

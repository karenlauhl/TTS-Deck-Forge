import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative base so the build works under any GitHub Pages path.
  base: './',
  plugins: [
    react(),
    // Service worker that precaches the whole app, so it works offline after the first visit.
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'script-defer',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'TTS Deck Forge',
        short_name: 'Deck Forge',
        description: 'Build custom card decks for Tabletop Simulator, entirely in your browser.',
        theme_color: '#2f5bd8',
        background_color: '#f6f6f4',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [{ src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,woff2,woff}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
      },
    }),
  ],
  // SheetJS is ~400 kB; the app is used offline after first load, so one chunk is fine.
  build: { chunkSizeWarningLimit: 1500 },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
});

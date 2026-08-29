import posthog from '@posthog/rollup-plugin'
import react from '@vitejs/plugin-react-swc'
import { defineConfig, loadEnv } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

import pkg from './package.json'
// https://vitejs.dev/config/
export default ({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const personalApiKey = process.env.POSTHOG_API_KEY || env.POSTHOG_API_KEY
  const projectId = process.env.POSTHOG_PROJECT_ID || env.POSTHOG_PROJECT_ID
  const host = process.env.POSTHOG_HOST || env.POSTHOG_HOST
  const uploadPosthogSourcemaps =
    command === 'build' && Boolean(personalApiKey && projectId)

  return defineConfig({
    define: {
      'import.meta.env.VITE_APP_VERSION': JSON.stringify(pkg.version),
    },
    // Strip console.* / debugger from production bundles only, so dev logging
    // is untouched. `command` is 'build' for `vite build`, 'serve' for the dev server.
    esbuild: {
      drop: command === 'build' ? ['console', 'debugger'] : [],
    },
    plugins: [
      react(),
      ...(uploadPosthogSourcemaps
        ? [
            posthog({
              personalApiKey,
              projectId,
              host,
              sourcemaps: {
                deleteAfterUpload: true,
              },
            }),
          ]
        : []),
      VitePWA({
        includeAssets: [
          'favicon.ico',
          'robots.txt',
          'apple-touch-icon.png',
          'safari-pinned-tab.svg',
          'mstile-150x150.png',
        ],
        injectManifest: {
          globIgnores: ['index.html'],
          globPatterns: ['**/*.{js,css,html,png,svg}'],
        },
        manifest: {
          background_color: '#ffffff',
          display: 'standalone',
          icons: [
            {
              sizes: '192x192',
              src: '/android-chrome-192x192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: '/android-chrome-512x512.png',
              type: 'image/png',
            },
            {
              sizes: '64x64',
              src: 'pwa-64x64.png',
              type: 'image/png',
            },
            {
              sizes: '192x192',
              src: 'pwa-192x192.png',
              type: 'image/png',
            },
            {
              sizes: '512x512',
              src: 'pwa-512x512.png',
              type: 'image/png',
            },
            {
              purpose: 'maskable',
              sizes: '512x512',
              src: 'maskable-icon-512x512.png',
              type: 'image/png',
            },
          ],
          name: 'Donetick: Simplify Tasks & Chores, Together.',
          short_name: 'Donetick',
          theme_color: '#ffffff',
        },
        registerType: 'prompt',
        workbox: {
          // The PWA plugin runs after PostHog's upload/cleanup stage, so prevent
          // it from leaving separate service-worker source maps in dist.
          sourcemap: false,
          clientsClaim: true, // Take control of uncontrolled clients as soon as the service worker becomes active
          maximumFileSizeToCacheInBytes: 6000000, // 6MB
          //Exclude API and Swagger routes from service worker navigation fallback
          navigateFallback: '/index.html',
          navigateFallbackDenylist: [
            /^\/api\//, // Exclude all API routes
            /^\/swagger/, // Exclude all Swagger routes
          ],
          skipWaiting: true, // Force the waiting service worker to become the active service worker
        },
      }),
    ],

    resolve: {
      alias: [
        {
          find: '@',
          replacement: '/src',
        },
      ],
    },
  })
}

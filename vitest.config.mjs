import { defineConfig } from 'vitest/config'

// Kept separate from vite.config.mjs on purpose: the app config pulls in the
// PWA plugin, PostHog sourcemap upload and SWC, none of which the unit tests
// need. Tests are plain JS modules under src/.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@',
        replacement: new URL('./src', import.meta.url).pathname,
      },
    ],
  },
  test: {
    environment: 'node',
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    environmentMatchGlobs: [['src/data/**', 'jsdom']],
    setupFiles: ['./src/test/setup.js'],
    clearMocks: true,
  },
})

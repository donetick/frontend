import react from '@vitejs/plugin-react-swc'
import { defineConfig } from 'vitest/config'

// Separate config from vite.config.js: tests don't need the PWA plugin, and
// keeping them apart keeps the test run fast. See TESTING.md for the strategy.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [{ find: '@', replacement: '/src' }],
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    css: false,
    // Only pick up test files, not the whole app.
    include: ['src/**/*.{test,spec}.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      // Coverage is reported, never gated. It is a signal, not a target.
      // See TESTING.md ("Coverage").
      include: ['src/utils/**', 'src/components/**'],
    },
  },
})

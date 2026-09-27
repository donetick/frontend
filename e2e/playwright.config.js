import { defineConfig, devices } from '@playwright/test'

// When frontend and backend are the same origin (embedded binary) set E2E_BASE_URL.
// For dev, set E2E_FRONTEND_URL (default 5173) and E2E_API_URL (default 2021) separately.
const FRONTEND_URL =
  process.env.E2E_FRONTEND_URL ||
  process.env.E2E_BASE_URL ||
  'http://localhost:5173'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // sequential – single SQLite DB
  reporter: process.env.CI ? 'github' : 'list',

  use: {
    baseURL: FRONTEND_URL,
    headless: true,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  globalSetup: './global-setup.js',

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})

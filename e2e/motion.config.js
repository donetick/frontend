import { defineConfig, devices } from '@playwright/test'

// Standalone, backend-free coverage of the real shared UI primitives.
export default defineConfig({
  testDir: './tests',
  testMatch: [
    'motion.spec.js',
    'motion-theme.spec.js',
    'page-transition.spec.js',
  ],
  workers: 1,
  fullyParallel: true,
  use: {
    baseURL: 'http://127.0.0.1:5178',
    headless: true,
    channel: process.env.E2E_BROWSER_CHANNEL,
  },
  webServer: {
    command: 'npm run dev -- --host 127.0.0.1 --port 5178 --strictPort',
    cwd: '..',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium' },
    },
    {
      name: 'reduced',
      use: { ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
    },
  ],
})

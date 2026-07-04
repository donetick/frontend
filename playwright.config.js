import { defineConfig, devices } from '@playwright/test'

// E2E covers only the handful of CRITICAL user flows (see be/TESTING.md), driven
// through the real app: the Go backend + the Vite frontend, both started below.
// Selectors use accessible names / roles / text so they survive the upcoming
// MUI Joy -> shadcn migration.
export default defineConfig({
  testDir: './e2e',
  // Fail the build if test.only is committed.
  forbidOnly: !!process.env.CI,
  // Retry once in CI: a single retry is our flaky-test cushion, not a crutch.
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Mobile viewport — Donetick ships as a PWA + Capacitor app, so the
    // critical flows must work on a phone-sized screen too.
    { name: 'mobile', use: { ...devices['Pixel 5'] } },
  ],

  // Start both servers automatically. First `go run` compiles, so allow time.
  // BE_DIR points at the backend checkout (defaults to a sibling ./be dir for
  // local dev; CI sets it to wherever it checks out donetick/donetick).
  webServer: [
    {
      command: `cd ${process.env.BE_DIR || '../be'} && DT_ENV=selfhosted DT_SQLITE_PATH=./e2e-test.db go run .`,
      port: 2021,
      reuseExistingServer: !process.env.CI,
      timeout: 180 * 1000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npm run dev',
      port: 5173,
      reuseExistingServer: !process.env.CI,
      timeout: 120 * 1000,
    },
  ],
})

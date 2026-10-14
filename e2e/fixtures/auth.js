import { expect, test as base } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Signup and login both land on the Home screen at `/`, not on the task list.
const atHome = url => new URL(url).pathname === '/'

/**
 * Fill and submit the signup form through the UI.
 * After successful signup the app auto-logs in and walks through the
 * onboarding flow (/circle-setup, then /ready) before landing on Home.
 */
export async function signUpViaUI(
  page,
  { displayName, email, password, username },
) {
  await page.goto('/signup')
  await page.locator('#username').fill(username)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#displayName').fill(displayName)
  await page.getByRole('button', { name: 'Create account' }).click()

  // Onboarding has gained and lost steps over time (/circle-setup, /ready,
  // /heard-about). Walk whatever is in front of us rather than hard-coding the
  // sequence, so adding a step doesn't break every signup test.
  for (let step = 0; step < 6; step++) {
    if (atHome(page.url())) break
    const next = page.getByRole('button', { name: /continue/i }).first()
    await next.waitFor({ timeout: 10_000 })
    await next.click()
    await page.waitForTimeout(750)
  }

  await page.waitForURL(atHome, { timeout: 10_000 })
}

/**
 * Fill and submit the login form through the UI.
 * After successful login the app redirects to Home.
 */
export async function loginViaUI(page, { password, username }) {
  await page.goto('/login')
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL(atHome, { timeout: 10_000 })
}

/**
 * A Playwright test fixture that provides a page already authenticated as the
 * shared E2E user (via persisted storage state, no UI interaction required).
 */
export const test = base.extend({
  authenticatedPage: async ({ browser }, callback) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'state.json'),
    })
    const page = await ctx.newPage()
    await callback(page)
    await ctx.close()
  },
})

export { expect }

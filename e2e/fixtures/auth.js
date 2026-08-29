import { expect, test as base } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Fill and submit the signup form through the UI.
 * After successful signup the app auto-logs in and walks through the
 * onboarding flow (/circle-setup, then /ready) before landing on /chores.
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

  await page.waitForURL('**/circle-setup', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/ready', { timeout: 10_000 })
  await page.getByRole('button', { name: 'Continue' }).click()

  await page.waitForURL('**/chores', { timeout: 10_000 })
}

/**
 * Fill and submit the login form through the UI.
 * After successful login the app redirects to /chores.
 */
export async function loginViaUI(page, { password, username }) {
  await page.goto('/login')
  await page.locator('#username').fill(username)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('**/chores', { timeout: 10_000 })
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

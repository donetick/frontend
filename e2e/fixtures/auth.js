import { test as base, expect } from '@playwright/test'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/**
 * Fill and submit the signup form through the UI.
 * After successful signup the app auto-logs in and redirects to /chores.
 */
export async function signUpViaUI(page, { username, email, password, displayName }) {
  await page.goto('/signup')
  await page.locator('#username').fill(username)
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page.locator('#displayName').fill(displayName)
  await page.getByRole('button', { name: 'Sign Up' }).click()
  await page.waitForURL('**/chores', { timeout: 10_000 })
}

/**
 * Fill and submit the login form through the UI.
 * After successful login the app redirects to /chores.
 */
export async function loginViaUI(page, { username, password }) {
  await page.goto('/login')
  // The username input on the login page has id="email" (quirk of the form)
  await page.locator('#email').fill(username)
  await page.locator('#password').fill(password)
  await page.getByRole('button', { name: 'Sign In' }).click()
  await page.waitForURL('**/chores', { timeout: 10_000 })
}

/**
 * A Playwright test fixture that provides a page already authenticated as the
 * shared E2E user (via persisted storage state, no UI interaction required).
 */
export const test = base.extend({
  authenticatedPage: async ({ browser }, use) => {
    const ctx = await browser.newContext({
      storageState: path.join(__dirname, '..', '.auth', 'state.json'),
    })
    const page = await ctx.newPage()
    await use(page)
    await ctx.close()
  },
})

export { expect }

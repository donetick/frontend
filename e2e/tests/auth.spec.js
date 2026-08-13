import { test, expect } from '@playwright/test'
import { signUpViaUI, loginViaUI } from '../fixtures/auth.js'

// Username must match /^[a-z.-]+$/ — no digits allowed.
// Generate a random lowercase-only suffix for uniqueness across runs.
function randomSuffix(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz'
  return Array.from({ length: len }, () =>
    chars[Math.floor(Math.random() * 26)],
  ).join('')
}

test.describe('Auth – Sign Up', () => {
  test('creates a new account and lands on /chores', async ({ page }) => {
    const suffix = randomSuffix()
    const user = {
      username: `test.signup.${suffix}`,
      email: `signup.${suffix}@donetick.test`,
      password: 'TestPassword123!',
      displayName: 'Test Signup User',
    }

    await signUpViaUI(page, user)

    await expect(page).toHaveURL(/\/chores/)
  })

  test('shows an error when username is too short', async ({ page }) => {
    await page.goto('/signup')
    await page.locator('#username').fill('ab') // < 4 chars
    await page.locator('#email').fill('short@donetick.test')
    await page.locator('#password').fill('ValidPass123!')
    await page.locator('#displayName').fill('Short User')
    await page.getByRole('button', { name: 'Create account' }).click()

    await expect(
      page.getByText('Username must be at least 4 characters'),
    ).toBeVisible()
  })
})

test.describe('Auth – Login', () => {
  // Re-use the shared E2E user that global-setup already created
  test('logs in with valid credentials and lands on /chores', async ({ page }) => {
    await loginViaUI(page, {
      username: 'e2e.user',
      password: 'E2ePassword123!',
    })

    await expect(page).toHaveURL(/\/chores/)
  })

  test('shows an error for wrong password', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#username').fill('e2e.user')
    await page.locator('#password').fill('WrongPassword!')
    await page.getByRole('button', { name: 'Sign In' }).click()

    // The notification snackbar / error message should appear
    await expect(
      page.getByText(/Login Failed|invalid|incorrect/i).first(),
    ).toBeVisible({ timeout: 5_000 })
  })
})

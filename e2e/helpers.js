import { expect } from '@playwright/test'

// Encode a number as lowercase letters (a-z). The username field only allows
// lowercase letters, dots and dashes, so we can't use digits.
function toLetters(n) {
  let s = ''
  do {
    s = String.fromCharCode(97 + (n % 26)) + s
    n = Math.floor(n / 26)
  } while (n > 0)
  return s
}

// Creates a unique account so tests are independent and can re-run against a
// persistent dev database without username collisions.
export function uniqueUser() {
  // Username regex is strict: /^[a-z.-]+$/ (lowercase letters, dot, dash only).
  const id = toLetters(Date.now()) + toLetters(Math.floor(Math.random() * 1e6))
  return {
    username: `etest-${id}`,
    email: `${id}@example.com`,
    password: 'e2e-password-123',
    displayName: `E2E test ${id}`,
  }
}

// Signs a fresh user up through the real UI and waits until the app has
// auto-logged-in and navigated away from the signup page.
export async function signUpNewUser(page) {
  const user = uniqueUser()

  await page.goto('/signup')
  await page.locator('input[name="username"]').fill(user.username)
  await page.locator('input[name="email"]').fill(user.email)
  await page.locator('input[name="password"]').fill(user.password)
  await page.locator('input[name="displayName"]').fill(user.displayName)
  await page.getByRole('button', { name: /sign up/i }).click()

  // On success the app auto-logs-in and redirects off /signup.
  await expect(page).not.toHaveURL(/\/signup/, { timeout: 15000 })

  return user
}

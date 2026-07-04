import { expect, test } from '@playwright/test'
import { signUpNewUser } from './helpers'

// Critical flow #1: a new user can sign up and lands authenticated.
test('a new user can sign up and reach the authenticated app', async ({ page }) => {
  await signUpNewUser(page)

  // We should be on an authenticated route, not back at login/signup.
  await expect(page).not.toHaveURL(/\/(login|signup)/)
})

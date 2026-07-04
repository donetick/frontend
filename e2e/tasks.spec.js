import { expect, test } from '@playwright/test'
import { signUpNewUser } from './helpers'

// Critical flows #2 and #3: a user can create a task and complete it.
test('a user can create a task and mark it done', async ({ page }) => {
  await signUpNewUser(page)

  const taskName = `Buy milk ${Date.now()}`

  // Create — the name field is the first textbox on the create form.
  await page.goto('/chores/create')
  await page.getByRole('textbox').first().fill(taskName)
  await page.getByRole('button', { name: 'Create' }).click()

  // The new task should appear in the list.
  await expect(page.getByText(taskName).first()).toBeVisible({ timeout: 15000 })

  // Open the task detail and complete it via the labelled action button.
  await page.getByText(taskName).first().click()
  await page.getByRole('button', { name: /mark as done/i }).click()

  // The detail page reflects the completion in its statistics, and the
  // "mark as done" action is no longer offered for the finished task.
  await expect(page.getByText(/completed:\s*1 times/i)).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('button', { name: /mark as done/i })).toHaveCount(0)
})

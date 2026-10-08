import { expect, test } from '../fixtures/auth.js'
import { API_URL } from '../global-setup.js'

test.describe('Chores – Create', () => {
  // All tests in this suite run as the pre-authenticated E2E user
  test.use({
    storageState: '.auth/state.json',
  })

  test('creates a daily recurring chore and confirms it appears in the list', async ({
    page,
  }) => {
    const choreName = `E2E Daily Chore ${Date.now()}`

    // ── Navigate to the create chore page ────────────────────────────────
    await page.goto('/chores/create')

    // ── Fill in the chore name ────────────────────────────────────────────
    // Name input is the first <input> on the page (no id/placeholder)
    await page.locator('input').first().fill(choreName)

    // ── Enable recurrence ─────────────────────────────────────────────────
    // Check the "Repeat this task" checkbox to reveal frequency options
    await page.getByLabel('Repeat this task').click()

    // Select "Daily" from the frequency chips
    await page.getByLabel('Daily').click()

    // The due date is auto-populated to today once a repeating type is selected.
    // No manual date entry required unless testing date-specific behaviour.

    // ── Save ──────────────────────────────────────────────────────────────
    await page.getByRole('button', { name: 'Create' }).click()

    // After save the app navigates back to the chore list
    await page.waitForURL('**/chores', { timeout: 15_000 })

    // ── Verify the chore appears in the UI ───────────────────────────────
    await expect(page.getByText(choreName)).toBeVisible({ timeout: 10_000 })

    // ── Verify the chore exists in the API ───────────────────────────────
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const apiRes = await fetch(`${API_URL}/api/v1/chores/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(apiRes.ok).toBe(true)

    const { res: chores } = await apiRes.json()
    const created = chores.find(c => c.name === choreName)
    expect(created).toBeDefined()
    expect(created.frequencyType).toBe('daily')
  })
})

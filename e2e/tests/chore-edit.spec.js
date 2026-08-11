import { expect, test } from '../fixtures/auth.js'
import { API_URL } from '../global-setup.js'

test.describe('ChoreEdit', () => {
  // All tests in this suite run as the pre-authenticated E2E user
  test.use({
    storageState: '.auth/state.json',
  })

  test('blocks save and shows an error when the name is left blank', async ({
    page,
  }) => {
    // ── Navigate to the create chore page, leave the form at defaults ──────
    await page.goto('/chores/create')

    // ── Attempt to save without a name ──────────────────────────────────────
    await page.getByRole('button', { name: 'Create' }).click()

    // ── The validation error is shown and we never leave the create page ───
    await expect(page.getByText('Name is required').first()).toBeVisible({
      timeout: 5_000,
    })
    await expect(page).toHaveURL(/\/chores\/create/)
  })

  test('days-of-the-week repeat: blocks save with no days selected, then succeeds once days are chosen', async ({
    page,
  }) => {
    const choreName = `E2E Weekly Chore ${Date.now()}`

    // ── Navigate to the create chore page ────────────────────────────────
    await page.goto('/chores/create')

    // ── Fill in the chore name ────────────────────────────────────────────
    await page.locator('input').first().fill(choreName)

    // ── Enable recurrence and switch to a custom "days of the week" schedule
    await page.getByLabel('Repeat this task').click()
    await page.getByLabel('Custom').click()
    await page.getByLabel('Days of the Week').click()

    // ── Attempt to save with zero days selected ─────────────────────────────
    await page.getByRole('button', { name: 'Create' }).click()
    await expect(
      page.getByText('Please select at least one day of the week').first(),
    ).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/chores\/create/)

    // ── Select Monday and Wednesday, then save successfully ────────────────
    await page.getByLabel('Monday').click()
    await page.getByLabel('Wednesday').click()
    await page.getByRole('button', { name: 'Create' }).click()

    await page.waitForURL('**/chores', { timeout: 15_000 })
    await expect(page.getByText(choreName)).toBeVisible({ timeout: 10_000 })

    // ── Verify the chore exists in the API with the selected days ─────────
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const apiRes = await fetch(`${API_URL}/api/v1/chores/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(apiRes.ok).toBe(true)

    const { res: chores } = await apiRes.json()
    const created = chores.find(c => c.name === choreName)
    expect(created).toBeDefined()
    expect(created.frequencyType).toBe('days_of_the_week')
    expect([...(created.frequencyMetadata?.days || [])].sort()).toEqual([
      'monday',
      'wednesday',
    ])
  })

  test('creates a chore, edits it after reload, and toggles Anyone assignment', async ({
    page,
  }) => {
    const originalName = `E2E Edit Chore ${Date.now()}`
    const updatedName = `${originalName} Updated`
    const updatedDescription = `Updated by e2e ${Date.now()}`
    // One week out, formatted as YYYY-MM-DD for the native date input
    const updatedDueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)

    // ── Create a simple one-off chore with a due date ───────────────────────
    await page.goto('/chores/create')
    await page.locator('input').first().fill(originalName)

    // Toggle "Anyone" on then off again — confirm it snaps back to the
    // default self-assignment before we submit.
    await page.getByLabel('Anyone').click()
    await expect(page.getByLabel('Anyone')).toBeChecked()
    await page.getByLabel('Anyone').click()
    await expect(page.getByLabel('Anyone')).not.toBeChecked()

    // Give it a due date so it's a simple one-off chore
    await page.getByLabel('Give this task a due date').click()

    await page.getByRole('button', { name: 'Create' }).click()
    await page.waitForURL('**/chores', { timeout: 15_000 })
    await expect(page.getByText(originalName)).toBeVisible({ timeout: 10_000 })

    // ── Look up the created chore via the API (id + self-assignment state) ─
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const listRes = await fetch(`${API_URL}/api/v1/chores/`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(listRes.ok).toBe(true)
    const { res: chores } = await listRes.json()
    const created = chores.find(c => c.name === originalName)
    expect(created).toBeDefined()
    // Default self-assignment: exactly one assignee, matching assignedTo.
    expect(created.assignees?.length).toBe(1)
    expect(created.assignedTo).toBe(created.assignees[0].userId)

    // ── Edit: change name, description, due date, and switch to Anyone ─────
    await page.goto(`/chores/${created.id}/edit`)

    await page.locator('input').first().fill(updatedName)
    await page.locator('.ql-editor').fill(updatedDescription)
    await page.locator('input[type="date"]').fill(updatedDueDate)
    await page.getByLabel('Anyone').click()

    await page.getByRole('button', { name: 'Save' }).click()
    await page.waitForURL('**/chores', { timeout: 15_000 })

    // ── Reload the edit page and confirm the new values persisted in the UI
    await page.goto(`/chores/${created.id}/edit`)
    await expect(page.locator('input').first()).toHaveValue(updatedName)
    await expect(page.locator('.ql-editor')).toContainText(updatedDescription)
    await expect(page.locator('input[type="date"]')).toHaveValue(updatedDueDate)
    await expect(page.getByLabel('Anyone')).toBeChecked()

    // ── Confirm persisted via the API too ───────────────────────────────────
    const detailRes = await fetch(`${API_URL}/api/v1/chores/${created.id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(detailRes.ok).toBe(true)
    const { res: updated } = await detailRes.json()
    expect(updated.name).toBe(updatedName)
    expect(updated.description).toContain(updatedDescription)
    // Due-date persistence is already confirmed via the reloaded date input
    // above; comparing the raw UTC `nextDueDate` string here would be
    // timezone-fragile since the app stores it as an end-of-local-day UTC
    // instant.
    // "Anyone" assignment: no specific assignees, no fixed assignedTo.
    expect(updated.assignees ?? []).toHaveLength(0)
    expect(updated.assignedTo).toBeFalsy()
  })
})

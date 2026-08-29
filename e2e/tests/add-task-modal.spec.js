import { expect, test } from '../fixtures/auth.js'
import { API_URL } from '../global-setup.js'

// Fetch the full chore list for the authenticated user via the API — used to
// verify a task's persisted fields without relying on list-page badge markup.
async function fetchChores(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'))
  const apiRes = await fetch(`${API_URL}/api/v1/chores/`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  expect(apiRes.ok).toBe(true)
  const { res: chores } = await apiRes.json()
  return chores
}

test.describe('AddTaskModal (quick-add)', () => {
  // All tests in this suite run as the pre-authenticated E2E user
  test.use({
    storageState: '.auth/state.json',
  })

  test('creates a task from plain text title only and it appears in the list', async ({
    page,
  }) => {
    const taskName = `E2E Quick Task ${Date.now()}`

    // ── Open the quick-add modal from the chores list ───────────────────────
    await page.goto('/chores')
    await page.getByTestId('open-add-task-modal').click()

    const dialog = page.getByRole('dialog', { name: 'Create new task' })
    await expect(dialog).toBeVisible()

    // ── Type a plain title (no parseable tokens) and submit with Enter ──────
    const input = dialog.locator('textarea')
    await input.fill(taskName)
    await input.press('Enter')

    // ── Modal closes and the task shows up in the list ──────────────────────
    await expect(dialog).toBeHidden()
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })

    // ── Verify it exists via the API too ─────────────────────────────────────
    const chores = await fetchChores(page)
    const created = chores.find(c => c.name === taskName)
    expect(created).toBeDefined()
  })

  test('smart-parses a due date and priority from typed text', async ({
    page,
  }) => {
    // Kept lowercase: parsePriority's cleanup step lowercases the whole
    // sentence when a priority token matches, so an already-lowercase prefix
    // sidesteps that quirk and round-trips unchanged.
    const taskName = `e2e parse task ${Date.now()}`

    await page.goto('/chores')
    await page.getByTestId('open-add-task-modal').click()

    const dialog = page.getByRole('dialog', { name: 'Create new task' })
    await expect(dialog).toBeVisible()

    const input = dialog.locator('textarea')
    await input.fill(`${taskName} !p1 tomorrow`)

    // ── Confirm the smart parse is reflected in the pickers before saving ───
    await expect(
      dialog.getByRole('button', { name: 'P1', exact: true }),
    ).toBeVisible()
    // The due-date trigger only ever reads "Due" in its empty state, so once
    // parsing lands a date the button relabels itself away from that text.
    await expect(
      dialog.getByRole('button', { name: 'Due', exact: true }),
    ).toHaveCount(0)

    await input.press('Enter')

    await expect(dialog).toBeHidden()
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })

    // ── Verify the parsed priority + due date persisted via the API ─────────
    const chores = await fetchChores(page)
    const created = chores.find(c => c.name === taskName)
    expect(created).toBeDefined()
    expect(created.priority).toBe(1)
    expect(created.nextDueDate).toBeTruthy()
  })

  test('creates a task using the picker UI directly, skipping smart-parse tokens', async ({
    page,
  }) => {
    const taskName = `E2E Picker Task ${Date.now()}`

    await page.goto('/chores')
    await page.getByTestId('open-add-task-modal').click()

    const dialog = page.getByRole('dialog', { name: 'Create new task' })
    await expect(dialog).toBeVisible()

    // Plain title only — none of "due date"/"priority"/"repeat" tokens.
    await dialog.locator('textarea').fill(taskName)

    // ── Set the due date via the picker (Due → Tomorrow → Apply) ────────────
    await dialog.getByRole('button', { name: 'Due', exact: true }).click()
    const dueDateDialog = page.getByRole('dialog', { name: 'Due Date' })
    await dueDateDialog
      .getByRole('checkbox', { name: 'Tomorrow', exact: true })
      .click()
    await dueDateDialog
      .getByRole('button', { name: 'Apply', exact: true })
      .click()

    // ── Set the priority via the picker (Priority → P2) ──────────────────────
    await dialog.getByRole('button', { name: 'Priority', exact: true }).click()
    await page.getByRole('button', { name: 'P2', exact: true }).click()
    await expect(
      dialog.getByRole('button', { name: 'P2', exact: true }),
    ).toBeVisible()

    // ── Set the repeat schedule via the picker (Repeat → Daily → Apply) ─────
    await dialog.getByRole('button', { name: 'Repeat', exact: true }).click()
    const repeatDialog = page.getByRole('dialog', { name: 'Repeat Schedule' })
    await repeatDialog
      .getByRole('checkbox', { name: 'Daily', exact: true })
      .click()
    await repeatDialog
      .getByRole('button', { name: 'Apply', exact: true })
      .click()

    await dialog.getByRole('button', { name: 'Create', exact: true }).click()

    await expect(dialog).toBeHidden()
    await expect(page.getByText(taskName)).toBeVisible({ timeout: 10_000 })

    // ── Verify the picker-set values persisted via the API ───────────────────
    const chores = await fetchChores(page)
    const created = chores.find(c => c.name === taskName)
    expect(created).toBeDefined()
    expect(created.priority).toBe(2)
    expect(created.frequencyType).toBe('daily')
    expect(created.nextDueDate).toBeTruthy()
  })

  test('Create button is disabled until the title is non-empty', async ({
    page,
  }) => {
    await page.goto('/chores')
    await page.getByTestId('open-add-task-modal').click()

    const dialog = page.getByRole('dialog', { name: 'Create new task' })
    await expect(dialog).toBeVisible()

    const createButton = dialog.getByRole('button', {
      name: 'Create',
      exact: true,
    })
    const input = dialog.locator('textarea')

    // ── Empty title ───────────────────────────────────────────────────────
    await expect(createButton).toBeDisabled()

    // ── Whitespace-only title still counts as empty ─────────────────────────
    await input.fill('   ')
    await expect(createButton).toBeDisabled()

    // ── Real text enables the button ─────────────────────────────────────────
    await input.fill('E2E Enable Check')
    await expect(createButton).toBeEnabled()

    // No task should be created by this test — back out via Cancel.
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
    await expect(dialog).toBeHidden()
  })
})

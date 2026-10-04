import { expect, test } from '../fixtures/auth.js'
import { API_URL } from '../global-setup.js'

test.describe('Realtime', () => {
  // All tests in this suite run as the pre-authenticated E2E user
  test.use({
    storageState: '.auth/state.json',
  })

  test('an open chore picks up subtask edits made elsewhere', async ({
    page,
  }) => {
    const choreName = `E2E Realtime Chore ${Date.now()}`

    // ── Create a chore with two subtasks via the API ────────────────────────
    await page.goto('/chores')
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    }
    const createRes = await fetch(`${API_URL}/api/v1/chores/`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: choreName,
        frequencyType: 'once',
        assignStrategy: 'random',
        isActive: true,
        subTasks: [
          { id: -1, name: 'Original first', orderId: 0 },
          { id: -2, name: 'Original second', orderId: 1 },
        ],
      }),
    })
    expect(createRes.ok).toBe(true)
    const { res: choreId } = await createRes.json()

    // ── Open the chore and its edit page, then go back to the view ─────────
    await page.evaluate(() => localStorage.setItem('sse_enabled', 'true'))
    const sseConnected = page.waitForResponse(res =>
      res.url().includes('/realtime/sse'),
    )
    await page.goto(`/chores/${choreId}`)
    await sseConnected
    await expect(page.getByText('Original second')).toBeVisible()
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.waitForURL(`**/chores/${choreId}/edit`)
    await expect(page.locator('input[value="Original second"]')).toBeVisible()
    await page.goBack()
    await page.waitForURL(`**/chores/${choreId}`)

    // ── Rename a subtask from "another device" (straight through the API) ──
    const getRes = await fetch(`${API_URL}/api/v1/chores/${choreId}`, {
      headers,
    })
    const { res: chore } = await getRes.json()
    const updateRes = await fetch(`${API_URL}/api/v1/chores/`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({
        ...chore,
        subTasks: chore.subTasks.map(subTask =>
          subTask.name === 'Original second'
            ? { ...subTask, name: 'Edited elsewhere' }
            : subTask,
        ),
      }),
    })
    expect(updateRes.ok).toBe(true)

    // ── The open view updates without navigating ───────────────────────────
    await expect(page.getByText('Edited elsewhere')).toBeVisible()
    await expect(page.getByText('Original second')).toHaveCount(0)

    // ── And the edit page no longer serves the cached copy ─────────────────
    await page.getByRole('button', { name: 'Edit' }).first().click()
    await page.waitForURL(`**/chores/${choreId}/edit`)
    await expect(page.locator('input[value="Edited elsewhere"]')).toBeVisible()
    await expect(page.locator('input[value="Original second"]')).toHaveCount(0)
  })
})

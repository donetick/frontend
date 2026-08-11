import { expect, test } from '../fixtures/auth.js'
import { API_URL } from '../global-setup.js'

test.describe('Projects & Filters – Create and navigate', () => {
  // All tests in this suite run as the pre-authenticated E2E user
  test.use({
    storageState: '.auth/state.json',
  })

  test('creates a project via the modal, tracks its task count, and filters chores by it', async ({
    page,
  }) => {
    const projectName = `E2E Project ${Date.now()}`
    const choreName = `E2E Project Chore ${Date.now()}`

    // ── Create the project via the modal ─────────────────────────────────
    await page.goto('/projects')
    await page.getByTestId('open-add-project-modal').click()

    const projectDialog = page.getByRole('dialog')
    await projectDialog.getByLabel('Project Name').fill(projectName)
    await projectDialog.getByRole('button', { name: 'Create' }).click()

    // ── Verify the project appears in the list with a 0 task count ───────
    // Scope to the row: the name Typography's parent Box also holds the
    // "N tasks" chip as a sibling, so one level up covers both.
    const projectRow = page
      .getByText(projectName, { exact: true })
      .locator('xpath=..')
    await expect(projectRow.getByText('0 tasks')).toBeVisible({
      timeout: 10_000,
    })

    // ── Look up the created project via the API to get its id ────────────
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const projectsRes = await fetch(`${API_URL}/api/v1/projects`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(projectsRes.ok).toBe(true)
    const projects = await projectsRes.json()
    const project = projects.find(p => p.name === projectName)
    expect(project).toBeDefined()

    // ── Create a chore inside the project directly via the API ───────────
    // Cheaper than driving the full chore-create UI, and this project is
    // brand new so its task count is guaranteed to go from 0 to 1.
    const choreRes = await fetch(`${API_URL}/api/v1/chores/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: choreName,
        frequencyType: 'once',
        assignStrategy: 'no_assignee',
        projectId: project.id,
      }),
    })
    expect(choreRes.ok).toBe(true)

    // ── Reload so the project list reflects the new task count ───────────
    await page.reload()
    await expect(projectRow.getByText('1 tasks')).toBeVisible({
      timeout: 10_000,
    })

    // ── Click the project card and confirm navigation + filtered results ─
    await page.getByText(projectName, { exact: true }).click()
    await page.waitForURL(new RegExp(`/chores\\?project=${project.id}(&|$)`), {
      timeout: 10_000,
    })
    await expect(page.getByText(choreName)).toBeVisible({ timeout: 10_000 })
  })

  test('creates a filter via AdvancedFilterBuilder, tracks its task count, and filters chores by it', async ({
    page,
  }) => {
    const filterProjectName = `E2E Filter Project ${Date.now()}`
    const filterName = `E2E Filter ${Date.now()}`
    const choreName = `E2E Filter Chore ${Date.now()}`

    // ── Seed a throwaway project via the API to use as the filter's ──────
    // condition target. A brand-new project has zero chores, so the
    // filter's task count is guaranteed to start at 0 regardless of
    // whatever else has accumulated in the shared test database.
    await page.goto('/filters')
    const token = await page.evaluate(() => localStorage.getItem('token'))
    const createProjectRes = await fetch(`${API_URL}/api/v1/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name: filterProjectName }),
    })
    expect(createProjectRes.ok).toBe(true)
    const { res: filterProject } = await createProjectRes.json()

    // Reload so the modal's project list (fetched on page load) includes it
    await page.reload()

    // ── Create the filter via AdvancedFilterBuilder ───────────────────────
    await page.getByTestId('open-add-filter-modal').click()

    const filterDialog = page.getByRole('dialog')
    await filterDialog
      .getByPlaceholder('e.g. Overdue tasks for Alice')
      .fill(filterName)
    // Condition: Projects is <the seeded project> — one condition is enough
    await filterDialog
      .getByRole('button', { name: filterProjectName, exact: true })
      .click()
    await filterDialog.getByRole('button', { name: 'Save Filter' }).click()

    // ── Verify the filter appears in the list with a 0 task count ────────
    // The name Typography sits inside a name-row Box, itself inside the
    // content Box that also holds the "N tasks" chip — two levels up.
    const filterRow = page
      .getByText(filterName, { exact: true })
      .locator('xpath=../..')
    await expect(filterRow.getByText('0 tasks')).toBeVisible({
      timeout: 10_000,
    })

    // ── Look up the created filter via the API to get its id ─────────────
    const filtersRes = await fetch(`${API_URL}/api/v1/filters`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(filtersRes.ok).toBe(true)
    const filters = await filtersRes.json()
    const filter = filters.find(f => f.name === filterName)
    expect(filter).toBeDefined()

    // ── Create a chore matching the filter's project condition ───────────
    const choreRes = await fetch(`${API_URL}/api/v1/chores/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: choreName,
        frequencyType: 'once',
        assignStrategy: 'no_assignee',
        projectId: filterProject.id,
      }),
    })
    expect(choreRes.ok).toBe(true)

    // ── Reload so the filter list reflects the new task count ────────────
    await page.reload()
    await expect(filterRow.getByText('1 tasks')).toBeVisible({
      timeout: 10_000,
    })

    // ── Click the filter card and confirm navigation + filtered results ──
    await page.getByText(filterName, { exact: true }).click()
    await page.waitForURL(new RegExp(`/chores\\?filterId=${filter.id}(&|$)`), {
      timeout: 10_000,
    })
    await expect(page.getByText(choreName)).toBeVisible({ timeout: 10_000 })
  })
})

import { expect, test } from '../fixtures/auth.js'

// Authenticated route layout: use actual theme breakpoint and mobile nav geometry.
test.use({ storageState: '.auth/state.json' })

test.beforeEach(async ({ page }) => {
  const snooze = page.getByRole('button', { name: 'Not now', exact: true })
  await page.addLocatorHandler(snooze, async () => {
    await snooze.click()
  })
})

for (const width of [390, 768, 899, 900, 1280]) {
  test(`page spacing and navigation clearance at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      '/things',
      '/labels',
      '/projects',
      '/filters',
      '/settings',
      '/settings/profile',
      '/activities',
      '/points',
    ]) {
      await page.goto(route)
      const dismiss = page.getByRole('button', { name: 'Not now', exact: true })
      if (await dismiss.isVisible()) await dismiss.click()
      const content = page.getByTestId('page-content')
      const expected = width >= 900 ? '24px' : '16px'
      await expect(content).toHaveCSS('padding-top', expected)
      await expect(content).toHaveCSS('padding-bottom', expected)
      await expect(content).toHaveCSS('padding-left', expected)
      await expect(content).toHaveCSS('padding-right', expected)
      await expect(content).toHaveCSS('max-width', '1200px')
      const container = content.locator(':scope > .MuiContainer-root').first()
      if (await container.count()) {
        await expect(container).toHaveCSS('padding-left', '0px')
        await expect(container).toHaveCSS('max-width', '100%')
      }
      const nav = page.getByRole('navigation', {
        name: 'Primary navigation',
        exact: true,
      })
      if (width <= 768 && (await nav.isVisible())) {
        await page.evaluate(() =>
          window.scrollTo({
            top: document.documentElement.scrollHeight,
            behavior: 'instant',
          }),
        )
        await expect
          .poll(async () => {
            const box = await content.boundingBox()
            return box.y + box.height
          })
          .toBeLessThanOrEqual(page.viewportSize().height)
        const box = await content.boundingBox()
        const viewport = page.viewportSize()
        const navHeight = await nav.evaluate(
          el => el.getBoundingClientRect().height,
        )
        expect(box.y + box.height).toBeLessThanOrEqual(
          viewport.height - navHeight + 1,
        )
      }
    }
  })
}

test('safe area is reserved once alongside mobile navigation', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 900 })
  await page.goto('/things')
  const content = page.getByTestId('page-content')
  await expect(content).toBeVisible()
  await page.evaluate(() =>
    document.documentElement.style.setProperty(
      '--safe-area-inset-bottom',
      '20px',
    ),
  )
  await expect(content).toHaveCSS('padding-bottom', '36px')
  const nav = page.getByRole('navigation', {
    name: 'Primary navigation',
    exact: true,
  })
  await expect(nav).toHaveCSS('padding-bottom', '20px')
  const spacerHeight = await nav.evaluate(
    el => el.nextElementSibling.getBoundingClientRect().height,
  )
  const barHeight = await nav.evaluate(el => el.getBoundingClientRect().height)
  expect(barHeight - spacerHeight).toBe(20)
})

test('task actions have a gap and explain their purpose on hover', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await page.goto('/chores')
  const full = page.getByRole('button', {
    name: 'Create task — full editor',
    exact: true,
  })
  const quick = page.getByRole('button', {
    name: 'Quick add task',
    exact: true,
  })
  await expect(full).toBeVisible()
  const a = await full.boundingBox()
  const b = await quick.boundingBox()
  expect(b.x - (a.x + a.width)).toBeGreaterThanOrEqual(16)
  await full.hover()
  await expect(page.getByRole('tooltip')).toContainText(
    'Create task — full editor',
  )
  await quick.hover()
  await expect(page.getByRole('tooltip')).toContainText('Quick add task')
})

test('optional task sidebar stays right with a clear gap and consistent cards', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 })
  await page.goto('/chores')
  const aside = page.getByRole('complementary', { name: 'Task insights' })
  await expect(aside).toBeVisible()
  const main = page
    .getByTestId('page-content')
    .locator(':scope > div > .MuiContainer-root')
  const left = await main.boundingBox()
  const right = await aside.boundingBox()
  expect(right.x - (left.x + left.width)).toBeGreaterThanOrEqual(24)
  await expect(aside).toHaveCSS('width', '315px')
  const cards = await aside.locator(':scope > *').evaluateAll(elements =>
    elements.map(e => ({
      width: e.getBoundingClientRect().width,
      margin: getComputedStyle(e).margin,
    })),
  )
  for (const card of cards) {
    expect(card.width).toBe(315)
    expect(card.margin).toBe('0px')
  }
  await page.setViewportSize({ width: 768, height: 900 })
  await expect(aside).toHaveCount(0)
})

test('public shells and task details remain responsive without horizontal overflow', async ({
  page,
}) => {
  test.setTimeout(180_000)
  for (const width of [390, 900, 1600]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      '/home',
      '/chores',
      '/archived',
      '/things/1',
      '/privacy',
      '/terms',
      '/login',
      '/signup',
      '/get-started',
    ]) {
      await page.goto(route)
      console.log('Checking route', route, 'width', width)
      await expect(page.locator('.page-wrapper')).toBeVisible({
        timeout: 15_000,
      })
      await expect
        .poll(() => page.evaluate(() => document.documentElement.scrollWidth))
        .toBeLessThanOrEqual(width)
      await expect(page.locator('vite-error-overlay')).toHaveCount(0)
    }
  }
})

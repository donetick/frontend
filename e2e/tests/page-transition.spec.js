import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === 'reduced') {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  }
  await page.goto('/e2e/fixtures/page-transition.html')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
})

test('route navigation actually runs outgoing and incoming animations', async ({
  page,
}, testInfo) => {
  const sampled = await page.evaluate(async () => {
    window.navigateFixture('/projects')
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    return {
      animations: document.getAnimations().map(animation => ({
        target: animation.effect.target.className,
        frames: animation.effect.getKeyframes(),
      })),
      snapshotCount: document.querySelectorAll('body > [aria-hidden="true"]')
        .length,
      liveHomeIds: document.querySelectorAll('#home').length,
    }
  })
  if (testInfo.project.name === 'reduced') {
    expect(sampled.animations).toHaveLength(0)
    expect(sampled.snapshotCount).toBe(0)
  } else {
    expect(sampled.animations).toHaveLength(2)
    expect(
      sampled.animations.some(animation => animation.target === 'page-wrapper'),
    ).toBe(true)
    expect(
      sampled.animations.every(animation =>
        animation.frames.some(frame => frame.filter === 'blur(3px)'),
      ),
    ).toBe(true)
    expect(sampled.snapshotCount).toBe(1)
    expect(sampled.liveHomeIds).toBe(0)
  }
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)
  await expect(page.locator('body > [aria-hidden="true"]')).toHaveCount(0)
})

test('navigation from a deeply scrolled page starts the destination at the top', async ({
  page,
}) => {
  // Both routes are tall so a shorter destination cannot mask a missing reset.
  await page.evaluate(() => {
    document.documentElement.style.scrollBehavior = 'smooth'
    window.scrollTo({ top: window.innerHeight * 4, behavior: 'instant' })
  })
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(1000)

  const scrollAfterCommit = await page.evaluate(async () => {
    window.navigateFixture('/projects')
    await new Promise(resolve => requestAnimationFrame(resolve))
    return window.scrollY
  })
  expect(scrollAfterCommit).toBe(0)
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeInViewport()
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)
  expect(await page.evaluate(() => window.scrollY)).toBe(0)
})

test('floating controls stay viewport-anchored throughout route entrance', async ({
  page,
}) => {
  await page.evaluate(() => window.navigateFixture('/projects'))
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
  await expect(page.getByTestId('fixture-fab')).toHaveCount(0)
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)

  const during = await page.evaluate(async () => {
    window.navigateFixture('/')
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    return [...document.body.children]
      .filter(
        node => getComputedStyle(node).position === 'fixed' && !node.inert,
      )
      .map(node => ({
        bottom: node.getBoundingClientRect().bottom,
        left: node.getBoundingClientRect().left,
      }))
  })
  expect(during).toHaveLength(2)
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)
  const after = await page.evaluate(() =>
    [...document.body.children]
      .filter(
        node => getComputedStyle(node).position === 'fixed' && !node.inert,
      )
      .map(node => ({
        bottom: node.getBoundingClientRect().bottom,
        left: node.getBoundingClientRect().left,
      })),
  )
  expect(after).toEqual(during)
  await expect(page.getByTestId('fixture-fab')).toBeInViewport()
})

test('rapid route changes clean up outgoing snapshots', async ({ page }) => {
  await page.evaluate(async () => {
    window.navigateFixture('/projects')
    await new Promise(resolve => setTimeout(resolve, 40))
    window.navigateFixture('/')
  })
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)
  await expect(page.locator('body > [aria-hidden="true"]')).toHaveCount(0)
})

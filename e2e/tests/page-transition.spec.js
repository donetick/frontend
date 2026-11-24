import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  if (testInfo.project.name === 'reduced') {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  }
  await page.goto('/e2e/fixtures/page-transition.html')
  await expect(page.getByRole('heading', { name: 'Home' })).toBeVisible()
})

test('route navigation uses only a lightweight destination animation', async ({
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
    expect(sampled.animations).toHaveLength(1)
    expect(
      sampled.animations.some(animation => animation.target === 'page-wrapper'),
    ).toBe(true)
    expect(
      sampled.animations.every(animation =>
        animation.frames.every(
          frame =>
            !frame.filter &&
            !frame.clipPath &&
            !frame.height &&
            !frame.transform.includes('scale'),
        ),
      ),
    ).toBe(true)
    expect(sampled.snapshotCount).toBe(0)
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

test('rapid route changes clean up entrance animations', async ({ page }) => {
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

test('disabling transitions cancels motion and preserves split-pane scroll', async ({
  page,
}) => {
  await page.evaluate(() => window.disableTransitionFixture(true))
  await page.evaluate(() => window.scrollTo({ top: 1000, behavior: 'instant' }))
  await page.evaluate(async () => {
    window.navigateFixture('/projects')
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
  })
  expect(await page.evaluate(() => window.scrollY)).toBe(1000)
  expect(await page.evaluate(() => document.getAnimations().length)).toBe(0)
})

test('panel navigation animates only incoming transform and opacity at natural height', async ({
  page,
}, testInfo) => {
  const sampled = await page.evaluate(async () => {
    window.changePanelFixture('second')
    await new Promise(resolve =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    )
    const content = document.querySelector('[data-testid="panel-content"]')
    return {
      height:
        content.parentElement.parentElement.getBoundingClientRect().height,
      copies: document.querySelectorAll('[data-testid="panel-content"]').length,
      frames: document
        .getAnimations()
        .map(animation => animation.effect.getKeyframes()),
    }
  })
  expect(sampled.height).toBe(120)
  expect(sampled.copies).toBe(1)
  expect(sampled.frames).toHaveLength(
    testInfo.project.name === 'reduced' ? 0 : 1,
  )
  for (const frames of sampled.frames) {
    for (const frame of frames) {
      expect(frame.height).toBeUndefined()
      expect(frame.filter).toBeUndefined()
      expect(frame.clipPath).toBeUndefined()
    }
    expect(frames[0].transform).toBe('translateX(24px)')
  }
  await page.evaluate(() => window.changePanelFixture('first'))
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)
  await expect(page.getByTestId('panel-content')).toHaveCount(1)
})

test('enabling reduced motion cancels an active route entrance', async ({
  page,
}) => {
  await page.evaluate(() => window.navigateFixture('/projects'))
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await expect
    .poll(() => page.evaluate(() => document.getAnimations().length))
    .toBe(0)
  await expect(page.getByRole('heading', { name: 'Projects' })).toBeVisible()
})

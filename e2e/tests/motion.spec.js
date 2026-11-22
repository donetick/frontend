import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }, testInfo) => {
  page.on('pageerror', error => {
    throw error
  })
  if (testInfo.project.name === 'reduced') {
    await page.emulateMedia({ reducedMotion: 'reduce' })
  }
  await page.goto('/e2e/fixtures/motion.html')
  await expect(page.getByRole('button', { name: 'Open dialog' })).toBeVisible()
})

test('dialog enters, exits before unmount, restores focus, and reverses safely', async ({
  page,
}, testInfo) => {
  const trigger = page.getByRole('button', { name: 'Open dialog' })
  await trigger.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect
    .poll(() => dialog.evaluate(el => getComputedStyle(el).opacity))
    .toBe('1')
  if (testInfo.project.name === 'reduced') {
    expect(await dialog.evaluate(el => getComputedStyle(el).transform)).toBe(
      'none',
    )
  }
  // Sample inside the page: protocol round trips can outlast an 80ms fade.
  expect(
    await page.evaluate(async () => {
      const node = document.querySelector('[role="dialog"]')
      window.setMotionModalOpen(false)
      await new Promise(resolve => setTimeout(resolve, 20))
      return node.isConnected
    }),
  ).toBe(true)
  await expect(dialog).toHaveCount(0)
  await expect(trigger).toBeFocused()

  await trigger.click()
  await expect(dialog).toBeVisible()
  await page.evaluate(() => {
    window.setMotionModalOpen(false)
    setTimeout(() => window.setMotionModalOpen(true), 40)
  })
  await page.waitForTimeout(400)
  await expect(dialog).toBeVisible()
  await expect
    .poll(() => dialog.evaluate(el => getComputedStyle(el).opacity))
    .toBe('1')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
})

test('menus and reused select listboxes retain positioning and keyboard behavior', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  await expect
    .poll(() => menu.evaluate(el => getComputedStyle(el).opacity))
    .toBe('1')
  const styles = await menu.evaluate(el => ({
    origin: getComputedStyle(el).transformOrigin,
    placement: el.getAttribute('data-popper-placement'),
    scale: getComputedStyle(el).scale,
    transform: el.style.transform,
  }))
  expect(styles.placement).toContain('bottom')
  expect(styles.transform).toContain('translate')
  if (testInfo.project.name === 'reduced') {
    await expect
      .poll(() => menu.evaluate(el => getComputedStyle(el).scale))
      .toBe('none')
  }
  await page.keyboard.press('Escape')
  await expect(menu).toBeHidden()
  await expect(
    page.getByRole('button', { name: 'Actions', exact: true }),
  ).toBeFocused()

  const select = page.getByRole('combobox', { name: 'Choose option' })
  for (let i = 0; i < 2; i++) {
    await select.click()
    await expect(page.getByRole('listbox')).toBeVisible()
    await expect
      .poll(() =>
        page.getByRole('listbox').evaluate(el => getComputedStyle(el).opacity),
      )
      .toBe('1')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('listbox')).toBeHidden()
  }
})

test('toast fades out before its built-in delayed unmount', async ({
  page,
}, testInfo) => {
  await page.getByRole('button', { name: 'Show toast' }).click()
  const toast = page.locator('.MuiSnackbar-root')
  await expect(toast).toBeVisible()
  await expect
    .poll(() => toast.evaluate(el => getComputedStyle(el).opacity))
    .toBe('1')
  if (testInfo.project.name === 'reduced') {
    await expect
      .poll(() => toast.evaluate(el => getComputedStyle(el).translate))
      .toBe('none')
  }
  expect(
    await page.evaluate(async () => {
      const node = document.querySelector('.MuiSnackbar-root')
      Array.from(document.querySelectorAll('button'))
        .find(button => button.textContent === 'Dismiss toast')
        .click()
      await new Promise(resolve => setTimeout(resolve, 20))
      return node.isConnected
    }),
  ).toBe(true)
  await expect(toast).toHaveCount(0)
})

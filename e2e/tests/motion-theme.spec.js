// These cases are part of the standalone motion suite (see motion.config.js).
import { expect, test } from '@playwright/test'

test('custom dark RTL theme preserves popup origins and notification motion', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('donetick-theme-skin', 'forest')
    localStorage.setItem('joy-mode', 'dark')
    localStorage.setItem('i18nextLng', 'ar')
    localStorage.setItem('language', JSON.stringify('ar'))
  })
  await page.goto('/e2e/fixtures/motion.html')
  await page.getByRole('button', { name: 'Actions', exact: true }).click()
  const menu = page.getByRole('menu')
  await expect(menu).toBeVisible()
  const geometry = await menu.evaluate(el => ({
    width: el.getBoundingClientRect().width,
    origin: parseFloat(getComputedStyle(el).transformOrigin),
    placement: el.getAttribute('data-popper-placement'),
    direction: getComputedStyle(el).direction,
  }))
  expect(geometry.direction).toBe('rtl')
  // Popper's placement is physical; don't mirror its origin a second time.
  if (geometry.placement.endsWith('end')) {
    expect(Math.abs(geometry.origin - geometry.width)).toBeLessThan(5)
  } else {
    expect(geometry.origin).toBeLessThan(5)
  }
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Show toast' }).click()
  const toast = page.locator('.MuiSnackbar-root')
  await expect(toast).toBeVisible()
  expect(await toast.evaluate(el => getComputedStyle(el).animationName)).toBe(
    'none',
  )
  await expect
    .poll(() => toast.evaluate(el => getComputedStyle(el).opacity))
    .toBe('1')
  await page.getByRole('button', { name: 'Dismiss toast' }).click()
  await expect(toast).toHaveCount(0)
})

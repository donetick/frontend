import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'
import { signUpNewUser } from './helpers'

// Automated accessibility scans of the critical-flow pages using axe-core.
//
// Automation catches only ~30-57% of WCAG issues (see be/TESTING.md), so this
// is a floor, not proof of conformance — manual keyboard + screen-reader passes
// still matter. We gate on the two highest-impact levels (critical + serious).
//
// The current MUI Joy UI has known critical/serious violations that the coming
// shadcn rebuild will rework. Rather than block on that pre-existing debt (or
// disable the check entirely), each page has a KNOWN-issues baseline: the test
// fails only on a NEW critical/serious violation type — real regression
// protection today. As shadcn fixes each issue, delete it from the baseline;
// when a baseline reaches [] the page is fully gated.
const GATE = ['critical', 'serious']

// axe rule IDs currently failing at critical/serious. SHRINK these as they're
// fixed — never grow them without a deliberate decision.
const KNOWN = {
  signup: ['color-contrast', 'label'],
  taskList: ['aria-progressbar-name', 'button-name', 'color-contrast'],
}

// a11y scanning runs on the desktop project only; mobile contrast/layout is a
// separate concern and would add noise here.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium', 'a11y scan runs on chromium only')
})

async function newGatingViolations(page, known) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze()
  return results.violations
    .filter(v => GATE.includes(v.impact))
    .filter(v => !known.includes(v.id))
    .map(v => ({ id: v.id, impact: v.impact }))
}

test('signup page has no NEW critical/serious a11y violations', async ({ page }) => {
  await page.goto('/signup')
  const regressions = await newGatingViolations(page, KNOWN.signup)
  expect(regressions, JSON.stringify(regressions, null, 2)).toEqual([])
})

test('task list has no NEW critical/serious a11y violations', async ({ page }) => {
  await signUpNewUser(page)
  const regressions = await newGatingViolations(page, KNOWN.taskList)
  expect(regressions, JSON.stringify(regressions, null, 2)).toEqual([])
})

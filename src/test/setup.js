import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, expect } from 'vitest'
import * as matchers from 'vitest-axe/matchers'
import { server } from './msw'

// Accessibility matchers (toHaveNoViolations) available in every test.
expect.extend(matchers)

// jsdom doesn't implement matchMedia, which MUI Joy's theme provider needs.
if (!window.matchMedia) {
  window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// MSW lifecycle. `onUnhandledRequest: 'error'` surfaces stray requests instead
// of silently letting them through — this is why we don't need to assert on
// outgoing requests manually (see TESTING.md).
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => {
  cleanup()
  server.resetHandlers()
})
afterAll(() => server.close())

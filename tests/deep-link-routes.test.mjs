import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

const source = readFileSync(
  new URL('../src/CapacitorListener.js', import.meta.url),
  'utf8',
)
const logicStart = source.indexOf('// Navigate to a chore from a deep link')
const logicEnd = source.indexOf('// OAuth callback handler for deep links')
assert.ok(
  logicStart !== -1 && logicEnd > logicStart,
  'deep link slice markers not found in CapacitorListener.js; update the sentinels above',
)
const logic = source.slice(logicStart, logicEnd)

function harness({ seenOnboarding = true, token = 'jwt' } = {}) {
  const routes = []
  const pendingInvites = []
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    URL,
    window: { location: { pathname: '/', search: '' } },
    localStorage: { getItem: key => (key === 'token' ? token : null) },
    routerNavigate: (path, opts) =>
      routes.push([path, opts === undefined ? undefined : { ...opts }]),
    setPendingInvite: code => pendingInvites.push(code),
    hasSeenOnboarding: () => seenOnboarding,
    handleOAuthDeepLink: () => {},
  })
  vm.runInContext(
    `${logic}\nglobalThis.api = { navigateToChore, handleUrlOpen }`,
    context,
  )
  return { ...context.api, routes, pendingInvites }
}

test('circle invite deep link forwards only the invite code', () => {
  const h = harness()
  h.handleUrlOpen('donetick://circle/join?code=ABC123&auto=1')
  assert.deepEqual(h.pendingInvites, ['ABC123'])
  assert.deepEqual(h.routes, [['/circle/join?code=ABC123', undefined]])
})

test('universal invite link drops extra query params and encodes the code', () => {
  const h = harness()
  h.handleUrlOpen('https://app.example.com/circle/join?code=a%26b&auto=1&x=y')
  assert.deepEqual(h.routes, [['/circle/join?code=a%26b', undefined]])
})

test('invite link without a code still opens the join view', () => {
  const h = harness()
  h.handleUrlOpen('donetick://circle/join?auto=1')
  assert.deepEqual(h.pendingInvites, [null])
  assert.deepEqual(h.routes, [['/circle/join', undefined]])
})

test('first-run invite goes to onboarding but still parks the code', () => {
  const h = harness({ token: null, seenOnboarding: false })
  h.handleUrlOpen('donetick://circle/join?code=ABC123')
  assert.deepEqual(h.pendingInvites, ['ABC123'])
  assert.deepEqual(h.routes, [['/onboarding', undefined]])
})

test('NFC chore link forwards a numeric id and the literal auto_complete=true', () => {
  const h = harness()
  h.handleUrlOpen('donetick://chores/123?auto_complete=true', true)
  assert.deepEqual(h.routes, [
    ['/chores/123?auto_complete=true', { seedHome: true }],
  ])
})

test('NFC chore link without auto_complete opens the chore only', () => {
  const h = harness()
  h.handleUrlOpen('donetick://chores/123')
  assert.deepEqual(h.routes, [['/chores/123', { seedHome: false }]])
})

test('auto_complete other than the literal true is not forwarded', () => {
  const h = harness()
  h.handleUrlOpen('donetick://chores/123?auto_complete=true%26x%3Dy')
  h.handleUrlOpen('donetick://chores/123?auto_complete=1')
  assert.deepEqual(h.routes, [
    ['/chores/123', { seedHome: false }],
    ['/chores/123', { seedHome: false }],
  ])
})

test('non-numeric chore ids are ignored', () => {
  const h = harness()
  h.handleUrlOpen('donetick://chores/123%3Fx%3Dy')
  h.handleUrlOpen('donetick://chores/../settings')
  h.navigateToChore('abc')
  h.navigateToChore('')
  h.navigateToChore(undefined)
  assert.deepEqual(h.routes, [])
})

test('notification taps keep working with numeric ids', () => {
  const h = harness()
  h.navigateToChore(42, { isColdStart: true })
  h.navigateToChore('7')
  assert.deepEqual(h.routes, [
    ['/chores/42', { seedHome: true }],
    ['/chores/7', { seedHome: undefined }],
  ])
})

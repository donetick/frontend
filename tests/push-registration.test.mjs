import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

const source = readFileSync(
  new URL('../src/CapacitorListener.js', import.meta.url),
  'utf8',
)
const logicStart = source.indexOf('let forceNextRegistration')
const logicEnd = source.indexOf('let launchUrlHandled')
assert.ok(
  logicStart !== -1 && logicEnd > logicStart,
  'push registration slice markers not found in CapacitorListener.js; update the sentinels above',
)
const logic = source.slice(logicStart, logicEnd)

function harness() {
  const prefs = new Map([['pushNotificationPreferences', '{"granted":true}']])
  const listeners = new Map()
  const events = new Map()
  const calls = []
  let valid = true
  let permission = 'granted'
  let post = async () => ({ ok: true })
  let remove = async () => ({ ok: true })
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    setTimeout: () => 1,
    clearTimeout() {},
    CustomEvent: class {
      constructor(type) {
        this.type = type
      }
    },
    window: {
      addEventListener: (name, callback) => events.set(name, callback),
      dispatchEvent() {},
    },
    Capacitor: { isNativePlatform: () => true, getPlatform: () => 'ios' },
    Preferences: {
      get: async ({ key }) => ({ value: prefs.get(key) ?? null }),
      set: async ({ key, value }) => prefs.set(key, value),
      remove: async ({ key }) => prefs.delete(key),
    },
    Device: { getInfo: async () => ({ model: 'phone' }) },
    getStableDeviceId: async () => 'device',
    getAppVersion: async () => '1.0 (1)',
    hasValidAccessToken: () => valid,
    PushNotifications: {
      addListener: (name, callback) => {
        assert(!listeners.has(name))
        listeners.set(name, callback)
      },
      checkPermissions: async () => ({ receive: permission }),
      register: async () => listeners.get('registration')({ value: 'fcm' }),
      unregister: async () => calls.push('native-delete'),
    },
    RegisterDeviceToken: async (...args) => {
      calls.push(['post', ...args])
      return post()
    },
    UnregisterDeviceToken: async () => {
      calls.push('delete')
      return remove()
    },
    UpdateDeviceActivity: async () => ({ ok: true }),
  })
  vm.runInContext(
    `${logic}\nglobalThis.api = { register: pushNotificationListenerRegistration, unregister: unregisterPushNotifications, drain: () => registrationQueue }`,
    context,
  )
  return {
    ...context.api,
    prefs,
    calls,
    events,
    setValid: value => {
      valid = value
    },
    setPermission: value => {
      permission = value
    },
    setPost: fn => {
      post = fn
    },
    setRemove: fn => {
      remove = fn
    },
  }
}

test('logout preserves opt-in and login registers again without duplicate listeners', async () => {
  const h = harness()
  await h.register()
  await h.drain()
  assert.equal(h.calls[0][4], '1.0 (1)')
  await h.unregister({ disable: false })
  assert.equal(
    JSON.parse(h.prefs.get('pushNotificationPreferences')).granted,
    true,
  )
  await h.register()
  await h.drain()
  assert.equal(h.calls.filter(call => Array.isArray(call)).length, 2)
})

test('disable waits for an in-flight POST before deleting', async () => {
  const h = harness()
  let release
  h.setPost(
    () =>
      new Promise(resolve => {
        release = resolve
      }),
  )
  await h.register()
  for (let i = 0; i < 50 && !release; i++) await Promise.resolve()
  assert.ok(release, 'registration POST was never issued')
  const disabling = h.unregister()
  release({ ok: true })
  assert.equal(await disabling, true)
  assert.deepEqual(
    h.calls.map(call => (Array.isArray(call) ? call[0] : call)),
    ['post', 'delete', 'native-delete'],
  )
  await h.register()
  assert.equal(h.calls.length, 3)
})

test('backend failure still cleans up native delivery and keeps registration for retry', async () => {
  const h = harness()
  await h.register()
  await h.drain()
  h.setRemove(async () => {
    throw new Error('offline')
  })
  assert.equal(await h.unregister(), false)
  assert.equal(h.calls.at(-1), 'native-delete')
  assert(h.prefs.has('deviceRegistration'))
  assert.equal(
    JSON.parse(h.prefs.get('pushNotificationPreferences')).granted,
    false,
  )
})

test('denied push permission clears the opt-in a forced registration persisted', async () => {
  const h = harness()
  h.setPermission('denied')
  await h.register({ force: true })
  await h.drain()
  assert.equal(h.calls.length, 0)
  assert.equal(h.prefs.has('pushNotificationPreferences'), false)
})

test('token skipped during expired access is registered after session refresh', async () => {
  const h = harness()
  h.setValid(false)
  await h.register()
  await h.drain()
  assert.equal(h.calls.length, 0)
  h.setValid(true)
  h.events.get('authTokensSaved')()
  // Allow permission and preference reads to finish before draining the queue.
  for (let i = 0; i < 12; i++) await Promise.resolve()
  await h.drain()
  assert.equal(h.calls.length, 1)
})

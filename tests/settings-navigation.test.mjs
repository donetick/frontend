import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

const read = path =>
  readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const exports = {}
vm.runInNewContext(
  transformSync(read('src/constants/settingsSections.js'), {
    jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  }).code,
  { exports, require: () => new Proxy({}, { get: (_, name) => name }) },
)
const {
  SETTINGS_GROUPS: groups,
  SETTINGS_SECTIONS: sections,
  getVisibleSettings,
} = exports
const visible = overrides =>
  getVisibleSettings({
    isParent: true,
    isNative: false,
    isCloud: true,
    ...overrides,
  })
const ids = list => Array.from(list, section => section.id)
const locale = JSON.parse(read('public/locales/en/settings.json'))
const router = read('src/contexts/RouterContext.jsx')

test('every destination has one home, a translated label, and a working route', () => {
  assert.equal(new Set(ids(sections)).size, sections.length)
  for (const section of sections) {
    assert.notEqual(Boolean(section.group), Boolean(section.parent), section.id)
    if (section.group) assert.ok(groups.includes(section.group), section.id)
    if (section.parent)
      assert.ok(
        sections.some(parent => parent.id === section.parent),
        section.id,
      )
    assert.ok(locale.overview.sections[section.id]?.title, section.id)
    assert.ok(locale.overview.sections[section.id]?.description, section.id)
    assert.ok(router.includes(`path: '${section.id}'`), section.id)
  }
  for (const group of groups) assert.ok(locale.overview.groups[group])
})

test('specialist pages are nested rather than cluttering the overview', () => {
  const parentOf = id => sections.find(section => section.id === id)?.parent
  assert.equal(parentOf('subaccounts'), 'circle')
  for (const id of ['calendar', 'notification-integrations', 'apitokens']) {
    assert.equal(parentOf(id), 'integrations')
  }
  assert.equal(parentOf('developer'), 'advanced')
  assert.equal(parentOf('widgets'), 'layout')
  assert.equal(parentOf('home-sections'), 'layout')
})

test('managed users do not see parent-only destinations', () => {
  const managed = visible({ isParent: false })
  assert.ok(managed.every(section => !section.parentOnly))
  for (const id of [
    'profile',
    'notifications',
    'integrations',
    'calendar',
    'notification-integrations',
    'home-sections',
  ]) {
    assert.ok(ids(managed).includes(id), id)
  }
})

test('widgets only appear on native platforms', () => {
  assert.ok(!ids(visible()).includes('widgets'))
  assert.ok(ids(visible({ isNative: true })).includes('widgets'))
})

test('Bridge only appears for self-hosted parent users after detection', () => {
  const bridge = sections.find(section => section.id === 'bridge')
  assert.equal(bridge.group, 'connections')
  assert.equal(bridge.parent, undefined)
  assert.ok(!ids(visible()).includes('bridge'))
  assert.ok(!ids(visible({ isCloud: undefined })).includes('bridge'))
  assert.ok(ids(visible({ isCloud: false })).includes('bridge'))
  assert.ok(
    !ids(visible({ isCloud: false, isParent: false })).includes('bridge'),
  )
})

test('visible children always have a visible parent destination', () => {
  for (const isParent of [true, false]) {
    for (const isNative of [true, false]) {
      const available = visible({ isParent, isNative, isCloud: false })
      for (const section of available) {
        if (section.parent)
          assert.ok(ids(available).includes(section.parent), section.id)
      }
    }
  }
})

test('webhook saving preserves admin and Plus guards and persists disabling', async () => {
  const source = read('src/views/Settings/WebhookSettings.jsx')
  const start = source.indexOf('const save = ') + 'const save = '.length
  const end = source.indexOf('\n\n  return (', start)
  assert.ok(start > 12 && end > start)
  for (const [isAdmin, plus] of [
    [false, true],
    [true, false],
    [true, true],
  ]) {
    const calls = []
    const save = vm.runInNewContext(`(${source.slice(start, end).trim()})`, {
      isAdmin,
      userProfile: { plus },
      isPlusAccount: profile => profile.plus,
      showPaywall: () => calls.push('paywall'),
      PAYWALL_REASON: { WEBHOOKS: 'webhooks' },
      setSaving: () => {},
      PutWebhookURL: async url => {
        calls.push(url)
        return { ok: true }
      },
      url: null,
      refetch: async () => {},
      setDraft: () => {},
      showSuccess: () => calls.push('success'),
      showError: () => calls.push('error'),
      t: key => key,
    })
    await save({ preventDefault() {} })
    assert.deepEqual(
      calls,
      !isAdmin ? [] : !plus ? ['paywall'] : [null, 'success'],
    )
  }
})

test('custom notification setup is separate from device and reminder settings', () => {
  const notifications = read('src/views/Settings/NotificationSetting.jsx')
  assert.ok(!notifications.includes('UpdateNotificationTarget'))
  assert.ok(notifications.includes("ids={['notification-integrations']}"))
  const integrations = read(
    'src/views/Settings/NotificationIntegrationsSettings.jsx',
  )
  assert.ok(integrations.includes('UpdateNotificationTarget'))
  assert.ok(!integrations.includes('registerPushNotifications'))
  assert.ok(!integrations.includes('useDeviceTokens'))
})

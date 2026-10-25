import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

const files = new Map()
const find = (node, name) => {
  if (!node || typeof node !== 'object') return undefined
  if (node.type === 'VariableDeclarator' && node.id.value === name)
    return node.init
  for (const child of Object.values(node)) {
    for (const item of Array.isArray(child) ? child : [child]) {
      const result = find(item, name)
      if (result) return result
    }
  }
}
const handler = (file, name, context) => {
  if (!files.has(file)) {
    const source = Buffer.concat([
      Buffer.from(';'),
      readFileSync(new URL(file, import.meta.url)),
    ])
    files.set(file, {
      source,
      ast: parseSync(source.toString(), { syntax: 'ecmascript', jsx: true }),
    })
  }
  const { ast, source } = files.get(file)
  const node = find(ast, name)
  assert.ok(node, `${name} exists`)
  return vm.runInNewContext(
    `(${source.subarray(node.span.start - ast.span.start, node.span.end - ast.span.start).toString()})`,
    context,
  )
}
const advanced = '../src/views/Settings/AdvancedSettings.jsx'
const realtime = '../src/components/RealTimeSettings.jsx'
const types = { DISABLED: 'disabled', SSE: 'sse' }

test('turning offline support off still requires explicit destructive confirmation', async () => {
  const calls = []
  let config
  const confirm = handler(advanced, 'showDisableOfflineConfirmation', {
    t: key => key,
    setConfirmModalConfig: value => {
      config = value
    },
    disableOfflineSupport: () => calls.push('clear'),
  })
  const toggle = handler(advanced, 'handleOfflineToggle', {
    showDisableOfflineConfirmation: confirm,
  })
  await toggle({ target: { checked: false } })
  assert.equal(config.isOpen, true)
  assert.equal(config.color, 'danger')
  assert.equal(config.confirmText, 'advanced.offlineDisableConfirm')
  assert.deepEqual(calls, [])
  config.onClose(false)
  assert.deepEqual(calls, [])
  assert.deepEqual(Object.keys(config), [])
  confirm()
  config.onClose(true)
  assert.deepEqual(calls, ['clear'])
})

test('offline cleanup retains success and partial-failure handling and always releases the switch', async () => {
  for (const failure of [null, 'database', 'cache']) {
    const calls = []
    const clear = handler(advanced, 'disableOfflineSupport', {
      setOfflineLoading: value => calls.push(['busy', value]),
      offlineDB: {
        clearAll: async () => {
          calls.push(['database'])
          if (failure === 'database') throw new Error('database unavailable')
        },
      },
      clearBrowserCacheStorage: async () => {
        calls.push(['cache'])
        if (failure === 'cache') throw new Error('cache unavailable')
      },
      setOfflineFeatureEnabled: value => calls.push(['enabled', value]),
      queryClient: {
        removeQueries: ({ queryKey }) => calls.push(['remove', ...queryKey]),
        invalidateQueries: () => calls.push(['invalidate']),
      },
      showNotification: ({ message, type }) =>
        calls.push(['notice', type, message]),
      t: key => key,
    })
    await clear()
    assert.deepEqual(calls[0], ['busy', true])
    assert.deepEqual(calls.at(-1), ['busy', false])
    for (const expected of [
      ['enabled', false],
      ['remove', 'pendingCommands'],
      ['remove', 'chores'],
      ['invalidate'],
    ]) {
      assert.ok(
        calls.some(call => JSON.stringify(call) === JSON.stringify(expected)),
      )
    }
    assert.deepEqual(calls.at(-2), [
      'notice',
      failure ? 'warning' : 'success',
      failure ? 'advanced.offlineDisabledPartial' : 'advanced.offlineDisabled',
    ])
  }
})

test('enabling offline support still starts sync and invalidates cached queries', async () => {
  const calls = []
  const toggle = handler(advanced, 'handleOfflineToggle', {
    setOfflineFeatureEnabled: value => calls.push(['enabled', value]),
    syncEngine: { sync: async () => calls.push(['sync']) },
    queryClient: { invalidateQueries: () => calls.push(['invalidate']) },
    showNotification: ({ message, type }) =>
      calls.push(['notice', type, message]),
    t: key => key,
  })
  await toggle({ target: { checked: true } })
  assert.deepEqual(calls, [
    ['enabled', true],
    ['sync'],
    ['invalidate'],
    ['notice', 'success', 'advanced.offlineEnabled'],
  ])
})

test('live updates preserve Plus gating, storage values, and connection actions', () => {
  for (const plus of [false, true]) {
    for (const value of ['disabled', 'sse']) {
      const calls = []
      const toggle = handler(realtime, 'handleRealtimeTypeChange', {
        userProfile: {},
        isPlusAccount: () => plus,
        showPaywall: reason => calls.push(['paywall', reason]),
        PAYWALL_REASON: { REALTIME_SYNC: 'realtime' },
        REALTIME_TYPES: types,
        setRealtimeType: type => calls.push(['type', type]),
        localStorage: {
          setItem: (key, stored) => calls.push(['storage', key, stored]),
        },
        sseContext: {
          connect: () => calls.push(['connect']),
          disconnect: () => calls.push(['disconnect']),
        },
      })
      toggle(value)
      assert.deepEqual(
        calls,
        plus
          ? [
              ['type', value],
              ['storage', 'sse_enabled', value === 'sse' ? 'true' : 'false'],
              [value === 'sse' ? 'connect' : 'disconnect'],
            ]
          : [['paywall', 'realtime']],
      )
    }
  }
})

test('connection status covers off, connecting, connected, error, and disconnected states', () => {
  const translations = JSON.parse(
    readFileSync(
      new URL('../public/locales/en/settings.json', import.meta.url),
    ),
  )
  for (const [enabled, sseContext, expected] of [
    [false, { isConnected: true }, 'off'],
    [true, { isConnected: true }, 'connected'],
    [true, { isConnecting: true }, 'connecting'],
    [true, { error: 'Network unavailable' }, 'error'],
    [true, {}, 'disconnected'],
  ]) {
    assert.equal(
      handler(realtime, 'getStatus', { enabled, sseContext })(),
      expected,
    )
    assert.ok(translations.advanced.realtime.status[expected])
  }
})

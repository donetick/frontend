import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

function load(path, modules, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { code } = transformSync(source, {
    jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  })
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(modules[name], `Unexpected import: ${name}`)
      return modules[name]
    },
    ...globals,
  })
  return exports
}

function setup({ cached, error, online = true, response } = {}) {
  const cache = new Map(
    cached === undefined ? [] : [['project_sections:p1', cached]],
  )
  let requests = 0
  const hooks = load('../src/views/Projects/ProjectQueries.js', {
    '@tanstack/react-query': { useQuery: options => options },
    '../../analytics': {},
    '../../contexts/PaywallContext': {},
    '../../hooks/NetworkManager': { networkManager: { isOnline: online } },
    '../../utils/entitlements': {},
    '../../utils/Fetcher': {
      GetProjectSections: async () => {
        requests++
        if (error) throw error
        return response
      },
    },
    '../../utils/OfflineDB': {
      offlineDB: {
        getKV: async key => cache.get(key) ?? null,
        saveKV: async (key, value) => cache.set(key, value),
      },
    },
    '../../utils/OfflineFeatureToggle': { isOfflineFeatureEnabled: () => true },
  })
  return {
    query: hooks.useProjectSections('p1'),
    cache,
    requests: () => requests,
  }
}

const sections = [{ id: 1, name: 'Todo' }]

test('successful section loads persist columns, including an empty board', async () => {
  for (const data of [sections, []]) {
    const { cache, query } = setup({
      response: { ok: true, json: async () => ({ res: data }) },
    })
    assert.deepEqual(await query.queryFn(), data)
    assert.deepEqual(cache.get('project_sections:p1'), data)
  }
})

test('offline section reads bypass the network and run even when queries would pause', async () => {
  const { query, requests } = setup({ online: false, cached: sections })
  assert.equal(query.networkMode, 'always')
  assert.deepEqual(await query.queryFn(), sections)
  assert.equal(requests(), 0)
})

test('unreachable server falls back to persisted columns', async () => {
  const { query } = setup({ cached: sections, error: new Error('unreachable') })
  assert.deepEqual(await query.queryFn(), sections)
})

test('missing or corrupt offline columns remain an error, not an empty board', async () => {
  for (const cached of [undefined, { invalid: true }]) {
    const { query } = setup({ online: false, cached })
    await assert.rejects(query.queryFn(), /No cached sections/)
  }
  const { query } = setup({ error: new Error('unreachable') })
  await assert.rejects(query.queryFn(), /unreachable/)
})

test('startup hydrates visited project columns without overwriting fresher data', async () => {
  const store = new Map([
    ['projects', [{ id: 'p1' }, { id: 'p2' }, { id: 'p3' }]],
    ['project_sections:p1', sections],
    ['project_sections:p2', []],
  ])
  const data = new Map()
  const fresh = [{ id: 2, name: 'Fresh' }]
  data.set(JSON.stringify(['projectSections', 'p2']), fresh)
  const { hydrateQueriesFromOfflineCache } = load(
    '../src/queries/OfflineHydration.js',
    {
      '../utils/OfflineDB': {
        offlineDB: {
          init: async () => {},
          getKV: async key => store.get(key) ?? null,
          getChores: async () => [],
        },
      },
      '../utils/OfflineFeatureToggle': { isOfflineFeatureEnabled: () => true },
      '../utils/PendingChores': { mergePendingCreates: async chores => chores },
    },
    { localStorage: { getItem: () => 'token' }, console },
  )
  await hydrateQueriesFromOfflineCache({
    getQueryState: key => ({ data: data.get(JSON.stringify(key)) }),
    setQueryData: (key, value) => data.set(JSON.stringify(key), value),
  })
  assert.deepEqual(
    data.get(JSON.stringify(['projectSections', 'p1'])),
    sections,
  )
  assert.equal(data.get(JSON.stringify(['projectSections', 'p2'])), fresh)
  assert.equal(data.has(JSON.stringify(['projectSections', 'p3'])), false)
})

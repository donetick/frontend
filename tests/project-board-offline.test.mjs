import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import * as ordering from '../src/utils/BoardOrdering.js'

function load(path, modules, globals = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8')
  const { code } = transformSync(source, {
    jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' },
    module: { type: 'commonjs' },
  })
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    TypeError,
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
    '../../utils/BoardOrdering': ordering,
    '../../utils/CommandQueue': {
      commandQueue: { getPending: async () => [] },
      CommandType: {},
    },
    '../../utils/PendingChores': {},
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

function setupMoves({ enabled = true, online = false, reject } = {}) {
  let commands = []
  let nextId = 1
  let chores = [
    { id: 1, projectId: 'p1', sectionId: 10, boardPosition: 0 },
    { id: 2, projectId: 'p1', sectionId: 20, boardPosition: 0 },
  ]
  const kv = new Map([['project_sections:p1', [{ id: 10 }, { id: 20 }]]])
  const queryData = new Map([
    [JSON.stringify(['chores', false]), { res: chores }],
    [JSON.stringify(['projectSections', 'p1']), kv.get('project_sections:p1')],
  ])
  const calls = []
  const networkManager = { isOnline: online }
  const offlineDB = {
    getCommands: async () => structuredClone(commands),
    enqueueCommand: async command => {
      const id = nextId++
      commands.push({ ...command, id })
      return id
    },
    updateCommand: async (id, updates) => {
      commands = commands.map(command =>
        command.id === id ? { ...command, ...updates } : command,
      )
    },
    updateCommandStatus: async (id, status, error) => {
      await offlineDB.updateCommand(id, { status, error })
    },
    incrementCommandRetry: async id => {
      const command = commands.find(command => command.id === id)
      command.retryCount = (command.retryCount || 0) + 1
    },
    removeCommand: async id => {
      commands = commands.filter(command => command.id !== id)
    },
    getKV: async key => kv.get(key) ?? null,
    saveKV: async (key, value) => kv.set(key, value),
    getChores: async () => structuredClone(chores),
    saveChores: async saved => {
      chores = [
        ...new Map(
          [...chores, ...saved].map(chore => [String(chore.id), chore]),
        ).values(),
      ]
    },
    deleteChores: async ids => {
      chores = chores.filter(chore => !ids.includes(chore.id))
    },
  }
  const toggle = { isOfflineFeatureEnabled: () => enabled }
  const queueModule = load(
    '../src/utils/CommandQueue.js',
    {
      './OfflineDB': { offlineDB },
      './OfflineFeatureToggle': toggle,
    },
    { console },
  )
  const pending = load('../src/utils/PendingChores.js', {
    './BoardOrdering': ordering,
    './CommandQueue': queueModule,
  })
  const fetchers = {
    MoveProjectChore: async (...args) => {
      calls.push(['task', ...args])
      if (reject) throw reject
      return { ok: true }
    },
    MoveProjectSection: async (...args) => {
      calls.push(['section', ...args])
      if (reject) throw reject
      return { ok: true }
    },
    CreateChore: async () => ({ ok: true, json: async () => ({ res: 99 }) }),
  }
  const queryClient = {
    cancelQueries: async () => {},
    invalidateQueries: () => {},
    getQueryData: key => queryData.get(JSON.stringify(key)),
    setQueryData: (key, updater) => {
      const id = JSON.stringify(key)
      queryData.set(
        id,
        typeof updater === 'function' ? updater(queryData.get(id)) : updater,
      )
    },
  }
  const hooks = load('../src/views/Projects/ProjectQueries.js', {
    '@tanstack/react-query': {
      useQuery: value => value,
      useMutation: value => value,
      useQueryClient: () => queryClient,
    },
    '../../analytics': {},
    '../../contexts/PaywallContext': {},
    '../../hooks/NetworkManager': { networkManager },
    '../../utils/BoardOrdering': ordering,
    '../../utils/CommandQueue': queueModule,
    '../../utils/PendingChores': pending,
    '../../utils/entitlements': {},
    '../../utils/Fetcher': fetchers,
    '../../utils/OfflineDB': { offlineDB },
    '../../utils/OfflineFeatureToggle': toggle,
  })
  const { syncEngine } = load(
    '../src/utils/SyncEngine.js',
    {
      '../hooks/NetworkManager': { networkManager },
      './ApiClient': {},
      './CommandQueue': queueModule,
      './Fetcher': fetchers,
      './ImageCache': {},
      './OfflineDB': { offlineDB },
      './OfflineFeatureToggle': toggle,
    },
    { console },
  )
  const mutate = async (mutation, variables) => {
    const context = await mutation.onMutate(variables)
    try {
      const result = await mutation.mutationFn(variables)
      mutation.onSettled?.(result, null, variables)
      return result
    } catch (error) {
      mutation.onError?.(error, variables, context)
      throw error
    }
  }
  return {
    ...queueModule,
    ...pending,
    hooks,
    calls,
    offlineDB,
    networkManager,
    syncEngine,
    mutate,
    queryClient,
  }
}

const taskMove = { projectId: 'p1', choreId: 1, sectionId: 20, afterChoreId: 2 }
const sectionMove = { projectId: 'p1', sectionId: 20, afterSectionId: null }

test('offline task and column moves persist and replay in order on reconnect', async () => {
  const app = setupMoves()
  const taskMutation = app.hooks.useMoveChore()
  const sectionMutation = app.hooks.useMoveSection()
  assert.equal(taskMutation.networkMode, 'always')
  assert.equal(sectionMutation.networkMode, 'always')
  await app.mutate(taskMutation, taskMove)
  await app.mutate(sectionMutation, sectionMove)
  assert.equal(app.calls.length, 0)
  const chores = await app.offlineDB.getChores()
  assert.equal(chores.find(chore => chore.id === 1).sectionId, 20)
  assert.equal(chores.find(chore => chore.id === 1).boardPosition, 1)
  assert.deepEqual(
    Array.from(
      await app.hooks.useProjectSections('p1').queryFn(),
      section => section.id,
    ),
    [20, 10],
  )
  app.networkManager.isOnline = true
  // Pending column order must survive background refetches before replay.
  assert.deepEqual(
    Array.from(
      await app.hooks.useProjectSections('p1').queryFn(),
      section => section.id,
    ),
    [20, 10],
  )
  await app.syncEngine._replayCommands()
  assert.deepEqual(app.calls, [
    ['task', 'p1', 1, 20, 2],
    ['section', 'p1', 20, null],
  ])
  assert.equal((await app.commandQueue.getPending()).length, 0)
})

test('queued placement survives a stale server read', async () => {
  const app = setupMoves()
  await app.mutate(app.hooks.useMoveChore(), {
    ...taskMove,
    afterChoreId: null,
  })
  const stale = [
    { id: 1, projectId: 'p1', sectionId: 10, boardPosition: 0 },
    { id: 2, projectId: 'p1', sectionId: 20, boardPosition: 0 },
  ]
  const merged = await app.mergePendingCreates(stale)
  assert.equal(merged.find(chore => chore.id === 1).boardPosition, 0)
  assert.equal(merged.find(chore => chore.id === 2).boardPosition, 1)
})

test('network failures queue moves, but HTTP rejections roll back', async () => {
  const disconnected = setupMoves({
    online: true,
    reject: new TypeError('Failed to fetch'),
  })
  await disconnected.mutate(disconnected.hooks.useMoveChore(), taskMove)
  assert.equal((await disconnected.commandQueue.getPending()).length, 1)
  const error = new Error('Forbidden')
  error.status = 403
  const rejected = setupMoves({ online: true, reject: error })
  await assert.rejects(
    rejected.mutate(rejected.hooks.useMoveChore(), taskMove),
    /Forbidden/,
  )
  assert.equal((await rejected.commandQueue.getPending()).length, 0)
  assert.equal(
    rejected.queryClient.getQueryData(['chores', false]).res[0].sectionId,
    10,
  )
})

test('disabled offline support never queues failed moves', async () => {
  const app = setupMoves({
    enabled: false,
    reject: new TypeError('Failed to fetch'),
  })
  await assert.rejects(
    app.mutate(app.hooks.useMoveChore(), taskMove),
    /Failed to fetch/,
  )
  assert.equal((await app.offlineDB.getCommands()).length, 0)
})

test('replay remaps both moved temp tasks and another task anchored after them', async () => {
  const app = setupMoves()
  const { CommandType: types, commandQueue: queue } = app
  await queue.enqueue(types.CREATE_CHORE, 'temp_1', {
    projectId: 'p1',
    sectionId: 10,
  })
  await queue.enqueue(types.MOVE_PROJECT_CHORE, 'temp_1', {
    ...taskMove,
    choreId: 'temp_1',
  })
  await queue.enqueue(types.MOVE_PROJECT_CHORE, 2, {
    ...taskMove,
    choreId: 2,
    afterChoreId: 'temp_1',
  })
  app.networkManager.isOnline = true
  await app.syncEngine._replayCommands()
  assert.deepEqual(app.calls, [
    ['task', 'p1', 99, 20, 2],
    ['task', 'p1', 2, 20, 99],
  ])
  assert.equal((await queue.getPending()).length, 0)
})

test('same-column reorders persist and sequential moves retain replay order', async () => {
  const app = setupMoves()
  const mutation = app.hooks.useMoveChore()
  await app.mutate(mutation, taskMove)
  await app.mutate(mutation, { ...taskMove, afterChoreId: null })
  const cached = await app.offlineDB.getChores()
  assert.equal(cached.find(chore => chore.id === 1).boardPosition, 0)
  assert.equal(cached.find(chore => chore.id === 2).boardPosition, 1)
  await app.commandQueue.compact()
  app.networkManager.isOnline = true
  await app.syncEngine._replayCommands()
  assert.deepEqual(app.calls, [
    ['task', 'p1', 1, 20, 2],
    ['task', 'p1', 1, 20, null],
  ])
})

test('online moves still go directly to the server', async () => {
  const app = setupMoves({ online: true })
  await app.mutate(app.hooks.useMoveChore(), taskMove)
  await app.mutate(app.hooks.useMoveSection(), sectionMove)
  assert.equal((await app.commandQueue.getPending()).length, 0)
  assert.deepEqual(app.calls, [
    ['task', 'p1', 1, 20, 2],
    ['section', 'p1', 20, null],
  ])
})

test('request timeouts also queue column moves', async () => {
  const error = new Error('Timed out')
  error.name = 'AbortError'
  const app = setupMoves({ online: true, reject: error })
  await app.mutate(app.hooks.useMoveSection(), sectionMove)
  const [command] = await app.commandQueue.getPending()
  assert.equal(command.commandType, app.CommandType.MOVE_PROJECT_SECTION)
})

test('transient replay errors leave moves pending for retry', async () => {
  const app = setupMoves({ reject: new TypeError('Failed to fetch') })
  await app.mutate(app.hooks.useMoveChore(), taskMove)
  app.networkManager.isOnline = true
  await assert.rejects(app.syncEngine._replayCommands(), /Failed to fetch/)
  const [command] = await app.commandQueue.getPending()
  assert.equal(command.status, 'pending')
  assert.equal(command.retryCount, 1)
})

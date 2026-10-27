import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync, transformSync } from '@swc/core'
import { MutationObserver, QueryClient } from '@tanstack/react-query'

const source = path => readFileSync(new URL(path, import.meta.url), 'utf8')
const queryCode = transformSync(
  source('../src/views/Filters/FilterQueries.js'),
  { jsc: { target: 'es2022' }, module: { type: 'commonjs' } },
).code
const filter = { id: 7, name: 'Morning', createdBy: 2, isPinned: false }
const updated = { ...filter, name: 'Evening', isPinned: true }
const operations = [
  ['useCreateFilter', 'CreateFilter', updated, 'Failed to create filter'],
  [
    'useUpdateFilter',
    'UpdateFilter',
    { filterId: 7, filterData: updated },
    'Failed to update filter',
  ],
  ['useDeleteFilter', 'DeleteFilter', 7, 'Failed to delete filter'],
  ['useToggleFilterPin', 'ToggleFilterPin', 7, 'Failed to toggle filter pin'],
]

// Execute the actual query module with HTTP Fetcher calls replaced by Response
// fixtures. React hook binding is replaced, but mutation lifecycle/cache behavior
// runs through the real TanStack MutationObserver and QueryClient.
const queries = response => {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false, gcTime: Infinity } },
  })
  client.setQueryData(['filters'], [filter])
  client.setQueryData(['filters', 7], filter)
  const requests = []
  const tracked = []
  const mutations = []
  const observers = []
  const fetchers = Object.fromEntries(
    operations.map(([, name]) => [
      name,
      async (...args) => {
        requests.push([name, ...args])
        return response()
      },
    ]),
  )
  const exports = {}
  vm.runInNewContext(queryCode, {
    exports,
    console: { error() {} },
    require: name => {
      if (name === '@tanstack/react-query') {
        return {
          useQueryClient: () => client,
          useMutation: options => {
            const observer = new MutationObserver(client, options)
            observers.push(observer)
            observer.subscribe(() => {})
            return {
              mutateAsync: input => observer.mutate(input),
              mutate: (input, callbacks) => {
                const pending = observer.mutate(input, callbacks)
                mutations.push(pending.catch(() => {}))
              },
            }
          },
        }
      }
      if (name === '../../utils/Fetcher') return fetchers
      if (name === '../../analytics') {
        return { track: (...args) => tracked.push(args) }
      }
      if (name === '../../contexts/PaywallContext') {
        return { usePaywall: () => ({ isPlanKnown: false }) }
      }
      if (name === '../../utils/entitlements') {
        return { canCreateQuickFilter: () => true }
      }
      if (name === '../../utils/OfflineDB') return {}
      throw new Error(`Unexpected dependency: ${name}`)
    },
  })
  return {
    client,
    exports,
    mutations,
    requests,
    tracked,
    dispose: () => {
      observers.forEach(observer => observer.reset())
      client.clear()
    },
  }
}

const cases = [
  [
    'backend error string',
    400,
    { error: 'Filter name already exists' },
    'Filter name already exists',
  ],
  [
    'structured error',
    400,
    { error: { message: 'Choose another name' } },
    'Choose another name',
  ],
  [
    'legacy message',
    400,
    { message: 'Choose another name' },
    'Choose another name',
  ],
  [
    'safe permission error with current 500 status',
    500,
    { error: 'user does not have permission to update this filter' },
    'user does not have permission to update this filter',
  ],
  [
    'raw server failure',
    500,
    { error: 'dial tcp 10.0.0.5:5432: connection refused' },
    null,
  ],
  [
    'legacy server failure',
    500,
    { message: 'SQL failed: SELECT secret FROM users' },
    null,
  ],
  [
    'permission text embedded in a server trace',
    500,
    {
      error:
        'user does not have permission to update this filter\n at internal/db:12',
    },
    null,
  ],
  [
    'safe delete permission error',
    500,
    { error: 'user does not have permission to delete this filter' },
    'user does not have permission to delete this filter',
  ],
  [
    'legacy fallback after invalid error',
    400,
    { error: {}, message: 'Choose another name' },
    'Choose another name',
  ],
  [
    'error object without message',
    400,
    { error: { stack: 'private trace' } },
    null,
  ],
  [
    'non-string legacy message',
    400,
    { message: { stack: 'private trace' } },
    null,
  ],
  ['blank message', 400, { error: '  ', message: '' }, null],
  ['empty JSON value', 500, null, null],
]

for (const [hook, fetcher, input, fallback] of operations) {
  for (const [name, status, payload, expected] of cases) {
    test(`${hook}: ${name}`, async () => {
      const api = queries(() => Response.json(payload, { status }))
      try {
        await assert.rejects(api.exports[hook]().mutateAsync(input), {
          message: expected ?? fallback,
        })
        assert.equal(api.requests[0][0], fetcher)
        assert.deepEqual(api.client.getQueryData(['filters']), [filter])
        assert.deepEqual(api.client.getQueryData(['filters', 7]), filter)
        assert.equal(api.client.getQueryState(['filters']).isInvalidated, false)
        assert.deepEqual(api.tracked, [])
      } finally {
        api.dispose()
      }
    })
  }

  for (const body of ['', '<html>Internal Server Error</html>']) {
    test(`${hook}: non-JSON failure uses operation fallback (${body ? 'HTML' : 'empty'})`, async () => {
      const api = queries(() => new Response(body, { status: 502 }))
      try {
        await assert.rejects(api.exports[hook]().mutateAsync(input), {
          message: fallback,
        })
      } finally {
        api.dispose()
      }
    })
  }

  test(`${hook}: success retains cache behavior`, async () => {
    const api = queries(() =>
      hook === 'useDeleteFilter'
        ? new Response(null, { status: 204 })
        : Response.json({ res: updated }),
    )
    try {
      const result = await api.exports[hook]().mutateAsync(input)
      assert.deepEqual(
        JSON.parse(JSON.stringify(result)),
        hook === 'useDeleteFilter' ? { id: 7, deleted: true } : updated,
      )
      assert.deepEqual(
        api.client.getQueryData(['filters']),
        hook === 'useDeleteFilter'
          ? []
          : hook === 'useCreateFilter'
            ? [filter, updated]
            : [updated],
      )
      assert.equal(api.client.getQueryState(['filters']).isInvalidated, true)
    } finally {
      api.dispose()
    }
  })
}

const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const value of Object.values(node)) {
    for (const child of Array.isArray(value) ? value : [value]) {
      const result = find(child, predicate)
      if (result) return result
    }
  }
}

// This is callback-level coverage, matching the repository's Node/SWC tests.
// It does not mount a component or claim browser/snackbar rendering coverage.
const callbacks = path => {
  const bytes = Buffer.from(`;${source(path)}`)
  const ast = parseSync(bytes.toString(), { syntax: 'ecmascript', jsx: true })
  return (name, context) => {
    const declaration = find(
      ast,
      node => node.type === 'VariableDeclarator' && node.id.value === name,
    )
    assert.ok(declaration, `Missing callback ${name}`)
    const { end, start } = declaration.init.span
    return vm.runInNewContext(
      `(${bytes.subarray(start - ast.span.start, end - ast.span.start)})`,
      context,
    )
  }
}
const viewCallback = callbacks('../src/views/Filters/FilterView.jsx')
const viewClose = context => {
  const bytes = Buffer.from(`;${source('../src/views/Filters/FilterView.jsx')}`)
  const ast = parseSync(bytes.toString(), { syntax: 'ecmascript', jsx: true })
  const element = find(
    ast,
    node =>
      node.type === 'JSXElement' &&
      node.opening.name.value === 'AdvancedFilterBuilder',
  )
  const handler = element.opening.attributes.find(
    attr => attr.name?.value === 'onClose',
  ).value.expression
  return vm.runInNewContext(
    `(${bytes.subarray(handler.span.start - ast.span.start, handler.span.end - ast.span.start)})`,
    context,
  )
}
const builderCallback = callbacks(
  '../src/views/Modals/Inputs/AdvancedFilterBuilder.jsx',
)

const view = api => {
  const state = { open: true, editing: filter, confirmation: {}, selected: '7' }
  const errors = []
  const context = {
    editingFilter: state.editing,
    useCallback: callback => callback,
    filtersData: [filter],
    isPlus: true,
    canCreateQuickFilter: () => true,
    showPaywall: () => {},
    savePendingRef: { current: false },
    deletePendingRef: { current: false },
    editorSessionRef: { current: 0 },
    confirmationSessionRef: { current: 0 },
    savedFilters: [filter],
    setShowAdvancedFilterBuilder: value => {
      state.open = value
    },
    setEditingFilter: value => {
      state.editing = value
      context.editingFilter = value
    },
    setConfirmationModel: value => {
      state.confirmation = value
    },
    localStorage: {
      getItem: () => state.selected,
      removeItem: () => {
        state.selected = null
      },
    },
    t: key => key,
    showError: error => errors.push(error),
    createFilterMutation: api.exports.useCreateFilter(),
    updateFilterMutation: api.exports.useUpdateFilter(),
    deleteFilterMutation: api.exports.useDeleteFilter(),
    togglePinMutation: api.exports.useToggleFilterPin(),
  }
  for (const name of [
    'handleAddFilter',
    'handleEditFilter',
    'handleSaveFilter',
    'handleDeleteFilter',
    'handleDeleteClicked',
    'handlePinFilter',
  ]) {
    context[name] = viewCallback(name, context)
  }
  context.closeEditor = viewClose(context)
  return { context, state, errors }
}

for (const action of ['update', 'create', 'delete', 'pin']) {
  test(`FilterView: failed ${action} notifies without success-side effects`, async () => {
    const api = queries(() =>
      Response.json({ error: 'filter not found' }, { status: 500 }),
    )
    const { context, errors, state } = view(api)
    try {
      if (action === 'delete') {
        context.handleDeleteClicked(7)
        state.confirmation.onClose(true)
      } else if (action === 'pin') {
        context.handlePinFilter(7)
      } else {
        if (action === 'create') context.editingFilter = null
        context.handleSaveFilter(updated)
      }
      await Promise.all(api.mutations)
      assert.deepEqual(errors, ['filter not found'])
      assert.equal(state.open, true)
      assert.equal(state.editing, filter)
      assert.equal(state.selected, '7')
      assert.deepEqual(api.client.getQueryData(['filters']), [filter])
      if (action === 'delete') assert.equal(state.confirmation.isOpen, true)
    } finally {
      api.dispose()
    }
  })
}

test('FilterView: save and delete close only after successful responses', async () => {
  let resolve
  const response = new Promise(done => {
    resolve = done
  })
  const api = queries(() => response)
  const { context, errors, state } = view(api)
  try {
    context.handleSaveFilter(updated)
    assert.equal(state.open, true)
    resolve(Response.json({ res: updated }))
    await Promise.all(api.mutations)
    assert.equal(state.open, false)
    assert.equal(state.editing, null)
    context.handleDeleteClicked(7)
    state.confirmation.onClose(true)
    assert.equal(state.confirmation.isOpen, true)
    await Promise.all(api.mutations)
    assert.deepEqual(JSON.parse(JSON.stringify(state.confirmation)), {})
    assert.deepEqual(errors, [])
  } finally {
    api.dispose()
  }
})

test('FilterView: cancelling deletion closes without sending HTTP', () => {
  const api = queries(() => {
    throw new Error('Should not request')
  })
  const { context, state } = view(api)
  try {
    context.handleDeleteClicked(7)
    state.confirmation.onClose(false)
    assert.deepEqual(JSON.parse(JSON.stringify(state.confirmation)), {})
    assert.deepEqual(api.requests, [])
  } finally {
    api.dispose()
  }
})

test('AdvancedFilterBuilder: validated save leaves closing to its caller', () => {
  const saved = []
  let closed = false
  const save = builderCallback('handleSave', {
    filterName: ' Morning ',
    filterNameExists: () => false,
    selections: { dueDate: { operators: [] } },
    conditions: [{ field: 'priority', operator: 'eq', value: 1 }],
    editingFilter: filter,
    filterColor: '#fff',
    isShared: false,
    onSave: value => saved.push(value),
    onClose: () => {
      closed = true
    },
  })
  save()
  assert.equal(saved.length, 1)
  assert.equal(saved[0].name, 'Morning')
  assert.equal(saved[0].id, 7)
  assert.equal(closed, false)
})

test('AdvancedFilterBuilder: invalid input still stays open and is not submitted', () => {
  const errors = []
  let submitted = false
  let closed = false
  const save = builderCallback('handleSave', {
    filterName: ' ',
    setError: error => errors.push(error),
    t: key => key,
    onSave: () => {
      submitted = true
    },
    onClose: () => {
      closed = true
    },
  })
  save()
  assert.deepEqual(errors, ['builder.errorName'])
  assert.equal(submitted, false)
  assert.equal(closed, false)
})

test('query networking failure remains rejected without modifying cache', async () => {
  const api = queries(() => {
    throw new TypeError('Failed to fetch')
  })
  try {
    await assert.rejects(
      api.exports
        .useUpdateFilter()
        .mutateAsync({ filterId: 7, filterData: updated }),
      { message: 'Failed to fetch' },
    )
    assert.deepEqual(api.client.getQueryData(['filters']), [filter])
  } finally {
    api.dispose()
  }
})

const tick = () => new Promise(resolve => setImmediate(resolve))

for (const action of ['create', 'update', 'delete']) {
  test(`FilterView: repeated pending ${action} submits only once`, async () => {
    const responses = []
    const api = queries(() => new Promise(resolve => responses.push(resolve)))
    const { context, errors, state } = view(api)
    try {
      let submit
      if (action === 'delete') {
        context.handleDeleteClicked(7)
        const dialog = state.confirmation
        submit = () => dialog.onClose(true)
      } else {
        if (action === 'create') context.editingFilter = null
        submit = () => context.handleSaveFilter(updated)
      }
      // Same-turn calls exercise the interval before any React re-render.
      submit()
      submit()
      await tick()
      assert.equal(api.requests.length, 1)
      responses[0](
        action === 'delete'
          ? new Response(null, { status: 204 })
          : Response.json({ res: updated }),
      )
      await Promise.all(api.mutations)
      assert.deepEqual(errors, [])
      if (action === 'delete')
        assert.equal(state.confirmation.isOpen, undefined)
      else assert.equal(state.open, false)
    } finally {
      responses.forEach(resolve => resolve(new Response(null, { status: 500 })))
      await Promise.all(api.mutations)
      api.dispose()
    }
  })
}

for (const action of ['create', 'update', 'delete']) {
  test(`FilterView: failed ${action} releases its pending guard for retry`, async () => {
    let calls = 0
    const api = queries(() =>
      ++calls === 1
        ? Response.json({ error: 'filter not found' }, { status: 500 })
        : action === 'delete'
          ? new Response(null, { status: 204 })
          : Response.json({ res: updated }),
    )
    const { context, state } = view(api)
    try {
      if (action === 'create') context.editingFilter = null
      if (action === 'delete') context.handleDeleteClicked(7)
      const submit =
        action === 'delete'
          ? () => state.confirmation.onClose(true)
          : () => context.handleSaveFilter(updated)
      submit()
      await Promise.all(api.mutations)
      submit()
      await Promise.all(api.mutations)
      assert.equal(api.requests.length, 2)
      if (action === 'delete')
        assert.equal(state.confirmation.isOpen, undefined)
      else assert.equal(state.open, false)
    } finally {
      api.dispose()
    }
  })
}

test('FilterView: canceled delete completion cannot close a new confirmation', async () => {
  let resolve
  const api = queries(
    () =>
      new Promise(done => {
        resolve = done
      }),
  )
  const { context, state } = view(api)
  try {
    context.savedFilters.push({ ...filter, id: 8, name: 'Other' })
    context.handleDeleteClicked(7)
    const oldDialog = state.confirmation
    oldDialog.onClose(true)
    await tick()
    oldDialog.onClose(false)
    context.handleDeleteClicked(8)
    const newDialog = state.confirmation
    resolve(new Response(null, { status: 204 }))
    await Promise.all(api.mutations)
    assert.equal(state.confirmation, newDialog)
    assert.equal(state.confirmation.isOpen, true)
    newDialog.onClose(true)
    await tick()
    assert.equal(api.requests.length, 2)
    resolve(new Response(null, { status: 204 }))
    await Promise.all(api.mutations)
    assert.equal(state.confirmation.isOpen, undefined)
  } finally {
    api.dispose()
  }
})

for (const nextFilter of [filter, { ...filter, id: 8, name: 'Other' }, null]) {
  test(`FilterView: canceled save completion cannot close reopened editor ${nextFilter?.id ?? 'new'}`, async () => {
    let resolve
    const api = queries(
      () =>
        new Promise(done => {
          resolve = done
        }),
    )
    const { context, state } = view(api)
    try {
      context.handleEditFilter(filter)
      context.handleSaveFilter(updated)
      await tick()
      context.closeEditor()
      if (nextFilter) context.handleEditFilter(nextFilter)
      else context.handleAddFilter()
      resolve(Response.json({ res: updated }))
      await Promise.all(api.mutations)
      assert.equal(state.open, true)
      assert.equal(state.editing, nextFilter)
      assert.deepEqual(api.client.getQueryData(['filters']), [updated])
      context.handleSaveFilter(updated)
      await tick()
      assert.equal(api.requests.length, 2)
      assert.equal(
        api.requests[1][0],
        nextFilter ? 'UpdateFilter' : 'CreateFilter',
      )
      resolve(Response.json({ res: updated }))
      await Promise.all(api.mutations)
      assert.equal(state.open, false)
      assert.equal(state.editing, null)
    } finally {
      api.dispose()
    }
  })
}

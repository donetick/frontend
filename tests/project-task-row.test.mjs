import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import { loadChorePermissions } from './helpers/chore-permissions.mjs'

// Exercise the row's real render and handlers with lightweight hook/component
// stubs, without needing the application providers or a browser.
const source = readFileSync(
  new URL(
    '../src/views/Projects/projectLayout/ProjectTaskRow.jsx',
    import.meta.url,
  ),
  'utf8',
)
const { code } = transformSync(source, {
  jsc: {
    parser: { syntax: 'ecmascript', jsx: true },
    transform: { react: { runtime: 'automatic' } },
    target: 'es2022',
  },
  module: { type: 'commonjs' },
})
const element = (type, props) => ({ type, props })
const components = new Proxy({}, { get: (_, name) => name })

function render(overrides = {}, options = {}) {
  const actions = []
  const selections = []
  const navigations = []
  const menus = []
  const filters = []
  const modules = {
    react: { memo: component => component },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    '@mui/joy': components,
    '@mui/icons-material': components,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
    'react-router-dom': { useNavigate: () => path => navigations.push(path) },
    '../../../contexts/LocalizationContext': {
      useLocalization: () => ({ timeFormat: 'HH:mm' }),
    },
    '../../../hooks/usePendingCommands': {
      usePendingCommands: () => ({ data: options.pendingCommands || [] }),
    },
    '../../../hooks/useChorePermissions': loadChorePermissions(options),
    '../../../utils/ChoreCardHelpers': {
      getDueDateChipColor: () => 'danger',
      getDueDateChipText: () => 'Yesterday',
      getRecurrentChipText: () => 'Daily',
    },
    '../../../utils/Chores': {
      notInCompletionWindow: () => options.outsideWindow,
    },
    '../../../utils/Colors': { getPriorityColor: () => '#d32f2f' },
    '../../../utils/ExternalLinks': {
      splitTextAtFirstHttpUrl: name => ({ before: name, after: '', url: null }),
      getFirstHttpUrl: () => null,
    },
    '../../components/ChoreActionMenu': {
      ChoreActionMenuTrigger: 'MenuTrigger',
    },
    '../../components/ChoreStatusChip': {
      default: 'ChoreStatusChip',
      __esModule: true,
    },
    '../../components/PendingBadge': {
      default: 'PendingBadge',
      __esModule: true,
    },
  }
  const exports = {}
  vm.runInNewContext(code, {
    exports,
    require: name => {
      assert.ok(modules[name], `Unexpected import: ${name}`)
      return modules[name]
    },
  })
  const props = {
    performers: [],
    onAction: (action, chore) => actions.push([action, chore.id]),
    onSelectionToggle: () => selections.push(true),
    onOpenActionMenu: (anchor, chore) => menus.push([anchor, chore.id]),
    onChipClick: filter => filters.push(filter),
    ...overrides,
    chore: {
      id: 9,
      name: 'A very long task',
      status: 0,
      priority: 1,
      circleId: 1,
      assignedTo: 5,
      ...overrides.chore,
    },
  }
  return {
    tree: exports.default(props),
    actions,
    selections,
    navigations,
    menus,
    filters,
  }
}

function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat(Infinity)) {
    const match = find(child, predicate)
    if (match) return match
  }
}
const control = row =>
  find(row.tree, node => node.type === 'Checkbox' || node.type === 'IconButton')

test('completion is an unchecked outlined checkbox with a priority tint', () => {
  const row = render()
  const checkbox = control(row)
  assert.equal(checkbox.type, 'Checkbox')
  assert.equal(checkbox.props.variant, 'outlined')
  assert.equal(checkbox.props.checked, false)
  assert.equal(checkbox.props.disabled, false)
  assert.equal(
    checkbox.props.sx['& .MuiCheckbox-checkbox'].borderColor,
    '#d32f2f',
  )
  checkbox.props.onChange()
  assert.deepEqual(row.actions, [['complete', 9]])
  assert.equal(
    control(render({}, { outsideWindow: true })).props.disabled,
    true,
  )
  assert.equal(
    control(render({ chore: { isActive: false } })).props.disabled,
    true,
  )
  assert.equal(
    control(render({ chore: { assignedTo: 8 } })).props.disabled,
    true,
  )
})

test('multi-select uses the same slot without completing the task', () => {
  const row = render({ isMultiSelectMode: true, isSelected: true })
  const checkbox = control(row)
  assert.equal(checkbox.props.checked, true)
  checkbox.props.onChange()
  assert.deepEqual(row.selections, [true])
  assert.deepEqual(row.actions, [])
  assert.equal(
    find(row.tree, node => node.type === 'MenuTrigger'),
    undefined,
  )
})

test('start, pause and approval retain their existing task actions', () => {
  for (const [status, action] of [
    [1, 'pause'],
    [2, 'start'],
    [3, 'approve'],
  ]) {
    const row = render(
      { chore: { id: 9, name: 'Task', status, createdBy: 5 } },
      status === 3
        ? { members: [{ userId: 5, circleId: 1, role: 'manager' }] }
        : {},
    )
    const button = control(row)
    assert.equal(button.props.disabled, false)
    button.props.onClick()
    assert.deepEqual(row.actions, [[action, 9]])
  }
  const pending = { chore: { id: 9, name: 'Task', status: 3, createdBy: 8 } }
  for (const options of [
    {},
    { userId: 8 },
    { members: [{ userId: 5, circleId: 2, role: 'admin' }] },
    {
      impersonatedUser: { userId: 8 },
      members: [{ userId: 5, circleId: 1, role: 'admin' }],
    },
  ]) {
    const row = render(pending, options)
    assert.equal(control(row), undefined)
    assert.ok(find(row.tree, node => node.type === 'HourglassEmpty'))
    assert.ok(find(row.tree, node => node.type === 'ChoreStatusChip'))
    assert.deepEqual(row.actions, [])
  }
  for (const role of ['admin', 'manager']) {
    assert.equal(
      control(render(pending, { members: [{ userId: 5, circleId: 1, role }] }))
        .props.disabled,
      false,
    )
  }
  const impersonated = render(pending, {
    impersonatedUser: { userId: 8 },
    members: [{ userId: 8, circleId: 1, role: 'manager' }],
  })
  control(impersonated).props.onClick()
  assert.deepEqual(impersonated.actions, [['approve', 9]])
})

test('restricted project visibility bounds task completion and approval', () => {
  const chore = {
    projectId: 10,
    project: { id: 10, visibility: 'members', created_by: 8, memberIds: [] },
  }
  const options = { members: [{ userId: 5, circleId: 1, role: 'admin' }] }
  assert.equal(control(render({ chore }, options)).props.disabled, true)
  assert.equal(
    control(render({ chore: { ...chore, status: 3 } }, options)),
    undefined,
  )
  const visible = { ...chore, project: { ...chore.project, memberIds: [5] } }
  assert.equal(
    control(render({ chore: visible }, options)).props.disabled,
    false,
  )
  assert.equal(
    control(render({ chore: { ...visible, status: 3 } }, options)).props
      .disabled,
    false,
  )
})

test('title supports keyboard navigation and menu uses the shared owner', () => {
  const row = render()
  const title = find(row.tree, node => node.props?.role === 'link')
  const event = { key: 'Enter', preventDefault() {}, stopPropagation() {} }
  title.props.onKeyDown(event)
  assert.deepEqual(row.navigations, ['/chores/9'])
  const selected = render({ isMultiSelectMode: true })
  find(selected.tree, node => node.props?.role === 'link').props.onKeyDown(
    event,
  )
  assert.deepEqual(selected.selections, [true])
  assert.deepEqual(selected.navigations, [])
  find(row.tree, node => node.type === 'MenuTrigger').props.onClick({
    currentTarget: 'anchor',
    stopPropagation() {},
  })
  assert.deepEqual(row.menus, [['anchor', 9]])
})

test('due date is plain text, labels filter and offline changes keep their indicator', () => {
  const label = { id: 1, name: 'Kitchen' }
  const row = render({
    chore: {
      id: 9,
      name: 'Task',
      status: 0,
      nextDueDate: '2026-01-01',
      labelsV2: [label],
      _pending: true,
    },
  })
  const due = find(row.tree, node => node.props?.component === 'time')
  assert.equal(due.props.children, 'Yesterday')
  assert.equal(due.props.dateTime, '2026-01-01')
  assert.equal(due.props.sx.color, 'danger.plainColor')
  assert.ok(find(row.tree, node => node.type === 'PendingBadge'))
  find(row.tree, node => node.props?.title === 'Kitchen').props.onClick({
    stopPropagation() {},
  })
  assert.equal(row.filters[0].label, label)
})

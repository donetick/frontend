import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import { getChorePermissions } from '../src/utils/ChoreAccess.js'

// Exercise the row's real render and handlers with lightweight hook/component
// stubs, without needing the application providers or a browser.
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
    '../../../contexts/ImpersonateUserContext': {
      useImpersonateUser: () => ({
        impersonatedUser: options.impersonatedUser,
      }),
    },
    '../../../contexts/LocalizationContext': {
      useLocalization: () => ({ timeFormat: 'HH:mm' }),
    },
    '../../../hooks/usePendingCommands': {
      usePendingCommands: () => ({ data: options.pendingCommands || [] }),
    },
    '../../../queries/UserQueries': {
      useUserProfile: () => ({ data: { id: 5 } }),
      useCircleMembers: () => ({ data: { res: options.members || [] } }),
    },
    '../../../utils/ChoreCardHelpers': {
      getDueDateChipColor: () => 'danger',
      getDueDateChipText: () => 'Yesterday',
      getRecurrentChipText: () => 'Daily',
    },
    '../../../utils/Chores': {
      notInCompletionWindow: () => options.outsideWindow,
    },
    '../../../utils/Colors': { getPriorityColor: () => '#d32f2f' },
    '../../../components/common/ExternalLinkChip': {
      LinkTypeIcon: 'LinkTypeIcon',
    },
    '../../components/ChoreStatusChip': {
      default: 'ChoreStatusChip',
      __esModule: true,
    },
    '../../../utils/ExternalLinks': {
      splitTextAtFirstLink: name => ({ before: name, after: '', link: null }),
      getFirstLink: () => null,
      openExternalLink: () => {},
    },
    '../../components/ChoreActionMenu': {
      ChoreActionMenuTrigger: 'MenuTrigger',
    },
    '../../components/PendingBadge': {
      default: 'PendingBadge',
      __esModule: true,
    },
  }
  modules['../contexts/ImpersonateUserContext'] =
    modules['../../../contexts/ImpersonateUserContext']
  modules['../queries/UserQueries'] = modules['../../../queries/UserQueries']
  modules['../utils/ChoreAccess'] = { getChorePermissions }
  function load(file) {
    const source = readFileSync(
      new URL(`../src/${file}`, import.meta.url),
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
    const exports = {}
    vm.runInNewContext(code, {
      exports,
      require: name => {
        assert.ok(modules[name], `Unexpected import: ${name}`)
        return modules[name]
      },
    })
    return exports
  }
  modules['../../../hooks/useChorePermissions'] = load(
    'hooks/useChorePermissions.js',
  )
  const Row = load('views/Projects/projectLayout/ProjectTaskRow.jsx').default
  const props = {
    chore: {
      id: 9,
      name: 'A very long task',
      status: 0,
      priority: 1,
      assignedTo: 5,
      circleId: 1,
    },
    performers: [],
    onAction: (action, chore) => actions.push([action, chore.id]),
    onSelectionToggle: () => selections.push(true),
    onChipClick: filter => filters.push(filter),
    onOpenActionMenu: (anchor, chore) => menus.push([anchor, chore.id]),
    ...overrides,
  }
  return {
    tree: Row(props),
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
    control(render({ chore: { id: 9, status: 0, assignedTo: 8, circleId: 1 } }))
      .props.disabled,
    true,
  )
  assert.equal(
    control(
      render({
        chore: {
          id: 9,
          status: 0,
          assignedTo: 5,
          circleId: 1,
          isActive: false,
        },
      }),
    ).props.disabled,
    true,
  )

  assert.equal(
    control(render({}, { outsideWindow: true })).props.disabled,
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
      {
        chore: {
          id: 9,
          name: 'Task',
          status,
          createdBy: 5,
          assignedTo: 5,
          circleId: 1,
        },
      },
      { members: [{ userId: 5, circleId: 1, role: 'manager' }] },
    )
    const button = control(row)
    assert.equal(button.props.disabled, false)
    button.props.onClick()
    assert.deepEqual(row.actions, [[action, 9]])
  }
})

test('approval hides the action from non-reviewers and uses the impersonated role', () => {
  const pending = {
    chore: { id: 9, name: 'Task', status: 3, createdBy: 5, circleId: 1 },
  }
  const assertPending = options => {
    const row = render(pending, options)
    assert.equal(control(row), undefined)
    assert.ok(find(row.tree, node => node.type === 'HourglassEmpty'))
    assert.deepEqual(row.actions, [])
  }
  assertPending({})
  assertPending({ members: [{ userId: 5, circleId: 2, role: 'admin' }] })
  for (const role of ['admin', 'manager']) {
    const row = render(pending, { members: [{ userId: 5, circleId: 1, role }] })
    assert.equal(control(row).props.disabled, false)
    control(row).props.onClick()
    assert.deepEqual(row.actions, [['approve', 9]])
  }
  assertPending({
    members: [
      { userId: 5, circleId: 1, role: 'admin' },
      { userId: 8, circleId: 1, role: 'member' },
    ],
    impersonatedUser: { userId: 8 },
  })
  const reviewer = render(pending, {
    members: [{ userId: 8, circleId: 1, role: 'manager' }],
    impersonatedUser: { userId: 8 },
  })
  control(reviewer).props.onClick()
  assert.deepEqual(reviewer.actions, [['approve', 9]])
})

test('label metadata still filters without completing the task', () => {
  const label = { id: 1, name: 'Kitchen' }
  const row = render({
    chore: {
      id: 9,
      name: 'Task',
      status: 0,
      labelsV2: [label, { id: 2, name: 'Home' }],
    },
  })
  const labels = find(row.tree, node => node.props?.title === 'Kitchen, Home')
  assert.equal(labels.props.component, 'button')
  let stopped = false
  labels.props.onClick({
    stopPropagation() {
      stopped = true
    },
  })
  assert.equal(stopped, true)
  assert.equal(row.filters[0].label, label)
  assert.deepEqual(row.actions, [])
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

test('due date is plain text and offline changes keep their indicator', () => {
  const row = render({
    chore: {
      id: 9,
      name: 'Task',
      status: 0,
      nextDueDate: '2026-01-01',
      _pending: true,
    },
  })
  const due = find(row.tree, node => node.props?.component === 'time')
  assert.equal(due.props.children, 'Yesterday')
  assert.equal(due.props.dateTime, '2026-01-01')
  assert.equal(due.props.sx.color, 'danger.plainColor')
  assert.ok(find(row.tree, node => node.type === 'PendingBadge'))
})

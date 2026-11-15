import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import { boardCardInteractions } from '../src/views/Projects/projectLayout/boardCardInteractions.js'
import { loadChorePermissions } from './helpers/chore-permissions.mjs'

const element = (type, props) => ({ type, props })
const components = new Proxy({}, { get: (_, name) => name })

function render(overrides = {}, options = {}) {
  const actions = []
  const selections = []
  const menus = []
  const filters = []
  const modules = {
    react: { memo: component => component },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    '@mui/joy': components,
    '@mui/icons-material': components,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
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
  function load(file) {
    const source = readFileSync(
      new URL(
        `../src/views/Projects/projectLayout/${file}.jsx`,
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
    const exports = {}
    vm.runInNewContext(code, {
      exports,
      require: name => {
        assert.ok(modules[name], `Unexpected import: ${name}`)
        return modules[name]
      },
    })
    return exports.default
  }
  const Action = load('ProjectTaskAction')
  modules['./ProjectTaskAction'] = { default: Action, __esModule: true }
  const Card = load('ProjectBoardCard')
  const props = {
    onAction: (action, chore) => actions.push([action, chore.id]),
    onSelectionToggle: () => selections.push(true),
    onOpenActionMenu: (anchor, chore) => menus.push([anchor, chore.id]),
    onChipClick: filter => filters.push(filter),
    ...overrides,
    chore: {
      id: 9,
      name: 'Wash the dishes',
      status: 0,
      circleId: 1,
      assignedTo: 5,
      ...overrides.chore,
    },
  }
  return {
    tree: Card(props),
    action: Action(props),
    actions,
    selections,
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
const event = { currentTarget: 'anchor', stopPropagation() {} }

test('one-tap actions retain completion, pause, resume and approval semantics', () => {
  for (const [status, action] of [
    [0, 'complete'],
    [1, 'pause'],
    [2, 'start'],
    [3, 'approve'],
  ]) {
    const card = render(
      { chore: { id: 9, name: 'Task', status, createdBy: 5 } },
      status === 3
        ? { members: [{ userId: 5, circleId: 1, role: 'manager' }] }
        : {},
    )
    assert.equal(card.action.props.disabled, false)
    assert.ok(card.action.props.sx.minHeight >= 44)
    card.action.props.onClick(event)
    assert.deepEqual(card.actions, [[action, 9]])
  }
  assert.equal(render({}, { outsideWindow: true }).action.props.disabled, true)
  assert.equal(
    render({ chore: { isActive: false } }).action.props.disabled,
    true,
  )
  assert.equal(render({ chore: { assignedTo: 8 } }).action.props.disabled, true)
})

test('approval respects roles, ownership and impersonation', () => {
  const props = { chore: { id: 9, name: 'Task', status: 3, createdBy: 8 } }
  for (const role of ['admin', 'manager']) {
    const card = render(props, {
      members: [{ userId: 5, circleId: 1, role }],
    })
    assert.equal(card.action.type, 'IconButton')
    assert.equal(card.action.props.disabled, false)
    card.action.props.onClick(event)
    assert.deepEqual(card.actions, [['approve', 9]])
  }
  for (const options of [
    {},
    { userId: 8 },
    { members: [{ userId: 5, circleId: 2, role: 'admin' }] },
    {
      impersonatedUser: { userId: 8 },
      members: [{ userId: 5, circleId: 1, role: 'admin' }],
    },
  ]) {
    const card = render(props, options)
    assert.equal(card.action.type, 'ChoreStatusChip')
    assert.equal(card.action.props.chore.status, 3)
    assert.equal(card.action.props.onClick, undefined)
    assert.deepEqual(card.actions, [])
  }
  const impersonated = render(props, {
    impersonatedUser: { userId: 8 },
    members: [{ userId: 8, circleId: 1, role: 'manager' }],
  })
  assert.equal(impersonated.action.props.disabled, false)
  impersonated.action.props.onClick(event)
  assert.deepEqual(impersonated.actions, [['approve', 9]])
})

test('restricted project visibility bounds task completion and approval', () => {
  const chore = {
    projectId: 10,
    project: { id: 10, visibility: 'members', created_by: 8, memberIds: [] },
  }
  const options = { members: [{ userId: 5, circleId: 1, role: 'admin' }] }
  assert.equal(render({ chore }, options).action.props.disabled, true)
  assert.equal(
    render({ chore: { ...chore, status: 3 } }, options).action.type,
    'ChoreStatusChip',
  )
  const visible = { ...chore, project: { ...chore.project, memberIds: [5] } }
  assert.equal(render({ chore: visible }, options).action.props.disabled, false)
  assert.equal(
    render({ chore: { ...visible, status: 3 } }, options).action.props.disabled,
    false,
  )
})

test('selection does not complete a task and hides secondary actions', () => {
  const card = render({ isMultiSelectMode: true, isSelected: true })
  assert.equal(card.action.type, 'Checkbox')
  assert.equal(card.action.props.checked, true)
  card.action.props.onChange()
  assert.deepEqual(card.selections, [true])
  assert.deepEqual(card.actions, [])
  assert.equal(
    find(card.tree, node => node.type === 'MenuTrigger'),
    undefined,
  )
})

test('title leaves keyboard ownership to the board surface and menus share an owner', () => {
  const card = render()
  const title = find(card.tree, node => node.props?.title === 'Wash the dishes')
  assert.equal(title.props.component, 'span')
  assert.equal(title.props.onClick, undefined)
  assert.equal(title.props.sx.overflowWrap, 'anywhere')
  find(card.tree, node => node.type === 'MenuTrigger').props.onClick(event)
  assert.deepEqual(card.menus, [['anchor', 9]])

  const boardSource = readFileSync(
    new URL(
      '../src/views/Projects/projectLayout/ProjectBoard.jsx',
      import.meta.url,
    ),
    'utf8',
  )
  assert.match(boardSource, /\.\.\.boardCardInteractions\(\{/)
  assert.match(boardSource, /role: 'button'/)
  assert.match(boardSource, /tabIndex: isOverlay \? -1 : 0/)
  for (const isMultiSelectMode of [false, true]) {
    const calls = []
    const interactions = boardCardInteractions({
      isMultiSelectMode,
      onOpen: () => calls.push('open'),
      onSelectionToggle: () => calls.push('select'),
      listeners: { onKeyDown: () => calls.push('drag') },
    })
    const surface = {}
    const keyEvent = {
      currentTarget: surface,
      target: surface,
      preventDefault() {},
    }
    interactions.onKeyDown({ ...keyEvent, key: 'Enter' })
    interactions.onKeyDown({ ...keyEvent, key: ' ' })
    assert.deepEqual(
      calls,
      isMultiSelectMode ? ['select', 'select'] : ['open', 'drag'],
    )
    interactions.onKeyDown({ ...keyEvent, target: {}, key: 'Enter' })
    assert.equal(calls.length, 2)
  }
})

test('metadata is secondary and queued actions stay visible', () => {
  const card = render({
    chore: {
      id: 9,
      name: 'Task',
      status: 0,
      nextDueDate: '2026-01-01',
      _pending: true,
    },
  })
  const due = find(card.tree, node => node.props?.component === 'time')
  assert.equal(due.props.dateTime, '2026-01-01')
  assert.equal(due.props.sx.color, 'danger.plainColor')
  assert.ok(find(card.tree, node => node.type === 'PendingBadge'))
  assert.equal(
    find(render().tree, node => node.props?.component === 'time'),
    undefined,
  )
  assert.ok(
    find(
      render({}, { pendingCommands: [{}] }).tree,
      node => node.type === 'PendingBadge',
    ),
  )
})

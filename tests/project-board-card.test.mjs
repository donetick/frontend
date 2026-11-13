import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { parseSync, transformSync } from '@swc/core'

import { getChorePermissions } from '../src/utils/ChoreAccess.js'
import { boardCardInteractions } from '../src/views/Projects/projectLayout/boardCardInteractions.js'

const element = (type, props) => ({ type, props })
const components = new Proxy({}, { get: (_, name) => name })

function render(overrides = {}, options = {}) {
  const actions = []
  const selections = []
  const menus = []
  const modules = {
    react: { memo: component => component },
    'react/jsx-runtime': { jsx: element, jsxs: element },
    '@mui/joy': components,
    '@mui/icons-material': components,
    'react-i18next': { useTranslation: () => ({ t: key => key }) },
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
  const Action = load(
    'views/Projects/projectLayout/ProjectTaskAction.jsx',
  ).default
  modules['./ProjectTaskAction'] = { default: Action, __esModule: true }
  const Card = load('views/Projects/projectLayout/ProjectBoardCard.jsx').default
  const props = {
    chore: {
      id: 9,
      name: 'Wash the dishes',
      status: 0,
      assignedTo: 5,
      circleId: 1,
    },
    onAction: (action, chore) => actions.push([action, chore.id]),
    onSelectionToggle: () => selections.push(true),
    onOpenActionMenu: (anchor, chore) => menus.push([anchor, chore.id]),
    ...overrides,
  }
  return {
    tree: Card(props),
    action: Action(props),
    actions,
    selections,
    menus,
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
// Extract the live TaskCard wrapper props rather than reproducing its wiring.
function taskCardSurface(overrides = {}) {
  const source = Buffer.concat([
    Buffer.from(';'),
    readFileSync(
      new URL(
        '../src/views/Projects/projectLayout/ProjectBoard.jsx',
        import.meta.url,
      ),
    ),
  ])
  const ast = parseSync(source.toString(), { syntax: 'ecmascript', jsx: true })
  function findAst(node, predicate) {
    if (!node || typeof node !== 'object') return undefined
    if (predicate(node)) return node
    for (const child of Object.values(node).flat()) {
      const found = findAst(child, predicate)
      if (found) return found
    }
  }
  const taskCard = findAst(
    ast,
    node => node.type === 'VariableDeclarator' && node.id.value === 'TaskCard',
  )
  assert.ok(taskCard, 'live TaskCard wrapper exists')
  const sheet = findAst(
    taskCard,
    node => node.type === 'JSXElement' && node.opening.name.value === 'Sheet',
  )
  assert.ok(sheet, 'TaskCard renders a Sheet surface')
  const spread = sheet.opening.attributes.find(
    node => node.type === 'SpreadElement',
  )
  assert.ok(spread, 'Sheet receives its interaction props')
  const expression = spread.arguments
  const navigations = []
  const selections = []
  const props = vm.runInNewContext(
    `(${source.subarray(expression.span.start - ast.span.start, expression.span.end - ast.span.start).toString()})`,
    {
      displayMode: 'board',
      isDragging: false,
      isMultiSelectMode: false,
      isOverlay: false,
      isSelected: false,
      dragAttributes: {},
      dragListeners: {},
      setActivatorNodeRef() {},
      chore: { id: 9, name: 'Wash the dishes' },
      boardCardInteractions,
      navigate: path => navigations.push(path),
      onSelectionToggle: () => selections.push(9),
      ...overrides,
    },
  )
  return { props, navigations, selections }
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
    assert.equal(card.action.props.disabled, false)
    assert.ok(card.action.props.sx.minHeight >= 44)
    card.action.props.onClick(event)
    assert.deepEqual(card.actions, [[action, 9]])
  }
  assert.equal(render({}, { outsideWindow: true }).action.props.disabled, true)
  assert.equal(
    render({ chore: { id: 9, status: 0, assignedTo: 8, circleId: 1 } }).action
      .props.disabled,
    true,
  )
  assert.equal(
    render({
      chore: { id: 9, status: 0, assignedTo: 5, circleId: 1, isActive: false },
    }).action.props.disabled,
    true,
  )
})

test('approval requires a reviewer in the task circle, including when impersonating', () => {
  const props = {
    chore: { id: 9, name: 'Task', status: 3, createdBy: 5, circleId: 1 },
  }
  const assertPending = options => {
    const card = render(props, options)
    assert.equal(card.action.type, 'ChoreStatusChip')
    assert.equal(card.action.props.chore, props.chore)
    assert.equal(card.action.props.onClick, undefined)
    assert.deepEqual(card.actions, [])
  }
  assertPending({}) // Ownership alone does not grant approval.
  assertPending({ members: [{ userId: 5, circleId: 2, role: 'admin' }] })
  for (const role of ['admin', 'manager']) {
    const card = render(props, { members: [{ userId: 5, circleId: 1, role }] })
    assert.equal(card.action.props.disabled, false)
    card.action.props.onClick(event)
    assert.deepEqual(card.actions, [['approve', 9]])
  }
  const members = [
    { userId: 5, circleId: 1, role: 'admin' },
    { userId: 8, circleId: 1, role: 'member' },
  ]
  assertPending({ members, impersonatedUser: { userId: 8 } })
  const reviewer = render(props, {
    members: [{ userId: 8, circleId: 1, role: 'manager' }],
    impersonatedUser: { userId: 8 },
  })
  reviewer.action.props.onClick(event)
  assert.deepEqual(reviewer.actions, [['approve', 9]])
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

test('card surface owns keyboard activation and menus have a shared owner', () => {
  const card = render()
  const title = find(card.tree, node => node.props?.title === 'Wash the dishes')
  assert.equal(title.props.component, 'span')
  const surface = {}
  let prevented = 0
  const keyEvent = {
    key: 'Enter',
    target: surface,
    currentTarget: surface,
    preventDefault() {
      prevented += 1
    },
  }
  const normal = taskCardSurface()
  assert.equal(normal.props.role, 'button')
  assert.equal(normal.props.tabIndex, 0)
  assert.equal(normal.props['aria-label'], 'Wash the dishes')
  normal.props.onKeyDown(keyEvent)
  assert.deepEqual(normal.navigations, ['/chores/9'])
  assert.deepEqual(normal.selections, [])
  assert.equal(prevented, 1)

  const selected = taskCardSurface({
    isMultiSelectMode: true,
    isSelected: true,
  })
  assert.equal(selected.props.role, 'button')
  assert.equal(selected.props.tabIndex, 0)
  assert.equal(selected.props['aria-pressed'], true)
  selected.props.onKeyDown({ ...keyEvent, key: ' ' })
  assert.deepEqual(selected.selections, [9])
  assert.deepEqual(selected.navigations, [])
  assert.equal(prevented, 2)
  assert.equal(taskCardSurface({ isOverlay: true }).props.tabIndex, -1)
  assert.equal(title.props.sx.overflowWrap, 'anywhere')
  find(card.tree, node => node.type === 'MenuTrigger').props.onClick(event)
  assert.deepEqual(card.menus, [['anchor', 9]])
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

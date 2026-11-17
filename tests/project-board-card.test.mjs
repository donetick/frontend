import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import { getChorePermissions } from '../src/utils/ChoreAccess.js'

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
    '../../../contexts/ImpersonateUserContext': {
      useImpersonateUser: () => ({
        impersonatedUser: options.impersonatedUser,
      }),
    },
    '../../../contexts/LocalizationContext': {
      useLocalization: () => ({ timeFormat: 'HH:mm' }),
    },
    '../../../hooks/useChorePermissions': {
      useChorePermissions: chore =>
        getChorePermissions(
          chore,
          options.impersonatedUser?.userId || 5,
          options.members || [],
        ),
    },
    '../../../components/common/ExternalLinkChip': {
      LinkTypeIcon: 'LinkTypeIcon',
    },
    '../../components/ChoreStatusChip': {
      default: 'ChoreStatusChip',
      __esModule: true,
    },
    '../../../hooks/usePendingCommands': {
      usePendingCommands: () => ({ data: options.pendingCommands || [] }),
    },
    '../../../queries/XPQueries': {
      useXPTranslation: () => ({
        t: key => key,
        xpMode: Boolean(options.xpMode),
      }),
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
    chore: { id: 9, name: 'Wash the dishes', status: 0 },
    onAction: (action, chore) => actions.push([action, chore.id]),
    onSelectionToggle: () => selections.push(true),
    onOpenActionMenu: (anchor, chore) => menus.push([anchor, chore.id]),
    onChipClick: filter => filters.push(filter),
    ...overrides,
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

function renderedText(node) {
  if (typeof node === 'string' || typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(renderedText).join('')
  if (!node || typeof node !== 'object') return ''
  return renderedText(node.props?.children)
}

test('board card shows the configured award in XP mode', () => {
  const card = render(
    { chore: { id: 9, name: 'Task', status: 0, points: 25, xpCategoryId: 3 } },
    { xpMode: true },
  )
  assert.ok(
    find(
      card.tree,
      node => node.type === 'Typography' && renderedText(node) === '25 XP',
    ),
  )
})

test('board card shows the configured award in Points mode', () => {
  const card = render(
    { chore: { id: 9, name: 'Task', status: 0, points: 25 } },
    { xpMode: false },
  )
  assert.ok(
    find(
      card.tree,
      node => node.type === 'Typography' && renderedText(node) === '25pts',
    ),
  )
})

test('board card omits award metadata for zero or missing amounts', () => {
  for (const points of [undefined, null, 0]) {
    const card = render(
      { chore: { id: 9, name: 'Task', status: 0, points } },
      { xpMode: true },
    )
    assert.doesNotMatch(renderedText(card.tree), /\d+\s?XP|\d+pts/)
  }
})

test('one-tap actions retain completion, pause, resume and approval semantics', () => {
  for (const [status, action] of [
    [0, 'complete'],
    [1, 'pause'],
    [2, 'start'],
    [3, 'approve'],
  ]) {
    const card = render({
      chore: { id: 9, name: 'Task', status, createdBy: 5 },
    })
    assert.equal(card.action.props.disabled, false)
    assert.ok(card.action.props.sx.minHeight >= 44)
    card.action.props.onClick(event)
    assert.deepEqual(card.actions, [[action, 9]])
  }
  assert.equal(render({}, { outsideWindow: true }).action.props.disabled, true)
})

test('approval respects roles, ownership and impersonation', () => {
  const props = { chore: { id: 9, name: 'Task', status: 3, createdBy: 8 } }
  assert.equal(render(props).action.props.disabled, true)
  assert.equal(
    render(props, { members: [{ userId: 5, role: 'admin' }] }).action.props
      .disabled,
    false,
  )
  assert.equal(
    render(props, { impersonatedUser: { userId: 8 } }).action.props.disabled,
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

test('title is a keyboard-operable native control and menus have a shared owner', () => {
  const card = render()
  const title = find(card.tree, node => node.props?.title === 'Wash the dishes')
  assert.equal(title.props.component, 'button')
  assert.equal(title.props.type, 'button')
  assert.equal(title.props.sx.overflowWrap, 'anywhere')
  find(card.tree, node => node.type === 'MenuTrigger').props.onClick(event)
  assert.deepEqual(card.menus, [['anchor', 9]])
})

test('metadata is secondary, labels still filter and queued actions stay visible', () => {
  const label = { id: 1, name: 'Kitchen' }
  const card = render({
    chore: {
      id: 9,
      name: 'Task',
      status: 0,
      nextDueDate: '2026-01-01',
      labelsV2: [label, { id: 2, name: 'Home' }],
      _pending: true,
    },
  })
  const due = find(card.tree, node => node.props?.component === 'time')
  assert.equal(due.props.dateTime, '2026-01-01')
  assert.equal(due.props.sx.color, 'danger.plainColor')
  assert.ok(find(card.tree, node => node.type === 'PendingBadge'))
  find(card.tree, node => node.props?.title === 'Kitchen').props.onClick(event)
  assert.equal(card.filters[0].label, label)
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

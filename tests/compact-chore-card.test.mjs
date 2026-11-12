import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

// Render the real card with lightweight hook/component stubs and inspect the
// element tree, without the application providers or a browser.
const source = readFileSync(
  new URL('../src/views/Chores/CompactChoreCard.jsx', import.meta.url),
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

function render(overrides = {}) {
  const actions = []
  const chips = []
  const modules = {
    'react/jsx-runtime': { jsx: element, jsxs: element, Fragment: 'Fragment' },
    '@mui/joy': components,
    '@mui/icons-material': components,
    'react-i18next': {
      useTranslation: () => ({
        t: (key, values) => (values ? `${key}:${values.name}` : key),
      }),
    },
    '../../components/common/ExternalLinkChip': {
      __esModule: true,
      default: 'ExternalLinkChip',
    },
    '../../contexts/LocalizationContext': {
      useLocalization: () => ({ timeFormat: 'HH:mm' }),
    },
    '../../contexts/ThemeSkinContext': {
      useThemeSkin: () => ({ skin: 'default' }),
    },
    '../../hooks/useChorePermissions': {
      useChorePermissions: () => ({ approve: true, complete: true }),
    },
    '../../hooks/usePendingCommands': {
      usePendingCommands: () => ({ data: [] }),
    },
    '../../utils/ChoreCardHelpers.jsx': {
      getDueDateChipColor: () => 'neutral',
      getDueDateChipText: () => 'Tomorrow',
      getRecurrentChipText: () => 'Daily',
    },
    '../../utils/Chores.jsx': { notInCompletionWindow: () => false },
    '../../utils/Colors.jsx': {
      getPriorityColor: () => '#d32f2f',
      getTextColorFromBackgroundColor: () => '#000000',
    },
    '../../utils/ExternalLinks.js': {
      getFirstLink: () => null,
      splitTextAtFirstLink: name => ({ before: name, after: '', link: null }),
    },
    '../components/ChoreActionMenu': {
      __esModule: true,
      default: 'ChoreActionMenu',
      ChoreActionMenuTrigger: 'MenuTrigger',
    },
    '../components/ChoreStatusChip': {
      __esModule: true,
      default: 'ChoreStatusChip',
    },
    '../components/PendingBadge': { __esModule: true, default: 'PendingBadge' },
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
    chore: {
      id: 9,
      name: 'Feed the cats',
      status: 0,
      labelsV2: [{ id: 1, name: 'Cats', color: '#90a4ae' }],
    },
    onAction: (action, chore) => actions.push([action, chore.id]),
    onSelectionToggle: () => {},
    onOpenActionMenu: () => {},
    ...overrides,
  }
  return { tree: exports.default(props), actions, chips }
}

function findAll(node, predicate, found = []) {
  if (!node || typeof node !== 'object') return found
  if (node.type && predicate(node)) found.push(node)
  for (const child of [node.props?.children].flat(Infinity))
    findAll(child, predicate, found)
  return found
}
const find = (node, predicate) => findAll(node, predicate)[0]
// The closest ancestor wrapper of a node, found by walking down from the root.
function parentOf(root, target) {
  let parent
  findAll(root, node => {
    if ([node.props?.children].flat(Infinity).includes(target)) parent = node
    return false
  })
  return parent
}
const completeButton = tree =>
  find(tree, node => node.props?.['aria-label']?.startsWith('completeChore'))
const checkbox = tree => find(tree, node => node.type === 'Checkbox')

test('the hidden multi-select checkbox is out of the tab order and labelled', () => {
  const { tree } = render()
  const box = checkbox(tree)
  assert.equal(box.props.slotProps.input.tabIndex, -1)
  assert.equal(
    box.props.slotProps.input['aria-label'],
    'selectTaskNamed:Feed the cats',
  )
  assert.equal(parentOf(tree, box).props['aria-hidden'], true)
  // The visible complete button stays reachable.
  assert.equal(completeButton(tree).props.tabIndex, undefined)
  assert.equal(
    parentOf(tree, completeButton(tree)).props['aria-hidden'],
    undefined,
  )
})

test('in multi-select mode the faded complete button is the one taken out', () => {
  const { tree } = render({ isMultiSelectMode: true })
  assert.equal(checkbox(tree).props.slotProps.input.tabIndex, undefined)
  assert.equal(parentOf(tree, checkbox(tree)).props['aria-hidden'], undefined)
  assert.equal(completeButton(tree).props.tabIndex, -1)
  assert.equal(parentOf(tree, completeButton(tree)).props['aria-hidden'], true)
})

test('label chips are plain text when there is nothing to do with them', () => {
  const { tree } = render()
  const chip = find(
    tree,
    node => node.type === 'Chip' && node.props.children === 'Cats',
  )
  const wrapper = parentOf(tree, chip)
  assert.equal(wrapper.props.tabIndex, undefined)
  assert.equal(wrapper.props.role, undefined)
})

test('clickable label chips are named buttons that work from the keyboard', () => {
  const clicked = []
  const { tree } = render({ onChipClick: filter => clicked.push(filter) })
  const chip = find(
    tree,
    node => node.type === 'Chip' && node.props.children === 'Cats',
  )
  const wrapper = parentOf(tree, chip)
  assert.equal(wrapper.props.role, 'button')
  assert.equal(wrapper.props.tabIndex, 0)
  assert.equal(wrapper.props['aria-label'], 'filterByLabel:Cats')
  let prevented = false
  wrapper.props.onKeyDown({
    key: ' ',
    preventDefault: () => (prevented = true),
    stopPropagation() {},
  })
  assert.equal(prevented, true)
  assert.equal(clicked[0].label.name, 'Cats')
})

test('round action buttons keep their look but take 44px taps', () => {
  const { tree } = render()
  const sx = completeButton(tree).props.sx
  assert.equal(sx.width, 32)
  assert.equal(sx['&::after'].inset, '-6px')
  assert.equal(sx['@media (prefers-reduced-motion: reduce)'].transition, 'none')
  const approve = find(
    render({ chore: { id: 9, name: 'Feed the cats', status: 3 } }).tree,
    node => node.props?.['aria-label']?.startsWith('choreView.approve'),
  )
  assert.equal(approve.props.sx.width, 24)
  assert.equal(approve.props.sx['&::after'].inset, '-10px')
})

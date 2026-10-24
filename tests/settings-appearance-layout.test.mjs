import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

// Exercise the actual UI callbacks without loading native plugins or a backend.
const source = name => {
  const buffer = Buffer.concat([
    Buffer.from(';'),
    readFileSync(new URL(`../src/views/Settings/${name}.jsx`, import.meta.url)),
  ])
  const ast = parseSync(buffer.toString(), { syntax: 'ecmascript', jsx: true })
  return {
    ast,
    evaluate: (node, context) =>
      vm.runInNewContext(
        `(${buffer.subarray(node.span.start - ast.span.start, node.span.end - ast.span.start).toString()})`,
        context,
      ),
  }
}
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of Object.values(node)) {
    for (const item of Array.isArray(child) ? child : [child]) {
      const result = find(item, predicate)
      if (result) return result
    }
  }
}
const variable = (file, name) =>
  find(
    file.ast,
    node => node.type === 'VariableDeclarator' && node.id.value === name,
  ).init
const prop = (file, component, name) => {
  const element = find(
    file.ast,
    node => node.type === 'JSXElement' && node.opening.name.value === component,
  )
  return element.opening.attributes.find(
    attribute => attribute.name?.value === name,
  ).value.expression
}

const layout = source('LayoutSettings')

test('bottom shortcuts enforce the limit without preventing removal', () => {
  let saved
  const config = [
    { id: 'home', enabled: true },
    { id: 'tasks', enabled: false },
  ]
  const context = {
    config,
    enabledCount: 4,
    MAX_BOTTOM_NAV_ITEMS: 4,
    saveConfig: value => {
      saved = value
    },
  }
  const toggle = layout.evaluate(
    variable(layout, 'handleToggleEnabled'),
    context,
  )
  toggle('tasks', true)
  assert.equal(saved, undefined)
  toggle('home', false)
  assert.equal(saved[0].enabled, false)
  context.enabledCount = 3
  toggle('tasks', true)
  assert.equal(saved[1].enabled, true)
  assert.equal(config[1].enabled, false)
})

test('reordering supports keyboard DnD and ignores cancellation or unchanged positions', () => {
  const list = source('SettingsReorderList')
  const calls = []
  const items = [{ id: 'home' }, { id: 'tasks' }, { id: 'search' }]
  const drag = list.evaluate(prop(list, 'DragDropContext', 'onDragEnd'), {
    items,
    onReorder: ids => calls.push([...ids]),
  })
  drag({ source: { index: 0 }, destination: null })
  drag({ source: { index: 0 }, destination: { index: 0 } })
  assert.equal(calls.length, 0)
  drag({ source: { index: 0 }, destination: { index: 2 } })
  assert.deepEqual(calls, [['tasks', 'search', 'home']])
  assert.deepEqual(
    items.map(item => item.id),
    ['home', 'tasks', 'search'],
  )
})

test('layout saves reordered IDs and ordering without dropping enabled state', () => {
  let saved
  const config = [
    { id: 'home', enabled: true, order: 0 },
    { id: 'tasks', enabled: false, order: 1 },
  ]
  const reorder = layout.evaluate(
    prop(layout, 'SettingsReorderList', 'onReorder'),
    {
      config,
      saveConfig: value => {
        saved = value
      },
    },
  )
  reorder(['tasks', 'home'])
  assert.deepEqual(JSON.parse(JSON.stringify(saved)), [
    { id: 'tasks', enabled: false, order: 0 },
    { id: 'home', enabled: true, order: 1 },
  ])
})

test('layout and side panel reopen in saved order', () => {
  for (const [name, getter] of [
    ['LayoutSettings', 'getBottomNavConfig'],
    ['SidepanelSettings', 'getSidepanelConfig'],
  ]) {
    const file = source(name)
    const initializer = find(
      file.ast,
      node =>
        node.type === 'ArrowFunctionExpression' &&
        node.body.type === 'CallExpression' &&
        node.body.callee.property?.value === 'sort',
    )
    const stored = [
      { id: 'home', order: 2 },
      { id: 'tasks', order: 0 },
    ]
    const restored = file.evaluate(initializer, { [getter]: () => stored })()
    assert.deepEqual(
      Array.from(restored, item => item.id),
      ['tasks', 'home'],
    )
    assert.equal(stored[0].id, 'home')
  }
})

test('start-screen and display-mode choices persist immediately', () => {
  const calls = []
  const startScreen = layout.evaluate(prop(layout, 'RadioGroup', 'onChange'), {
    setDefaultView: value => calls.push(['state', value]),
    saveDefaultView: value => calls.push(['storage', value]),
  })
  startScreen({ target: { value: 'tasks' } })
  assert.deepEqual(calls, [
    ['state', 'tasks'],
    ['storage', 'tasks'],
  ])
  const theme = source('ThemeToggle')
  const change = theme.evaluate(prop(theme, 'RadioGroup', 'onChange'), {
    setThemeMode: value => calls.push(['storage', value]),
    setMode: value => calls.push(['provider', value]),
  })
  for (const value of ['light', 'dark', 'system']) {
    calls.length = 0
    change({ target: { value } })
    assert.deepEqual(calls, [
      ['storage', value],
      ['provider', value],
    ])
  }
})

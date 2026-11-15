import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

const source = path =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

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
const attribute = (element, name) =>
  element.opening.attributes.find(item => item.name?.value === name)

// Evaluate the production color expressions, rather than pinning their old
// spelling or copying the theme decision into the test fixture.
const actionColor = (path, matches, context) => {
  const bytes = Buffer.from(`;${source(path)}`)
  const ast = parseSync(bytes.toString(), { syntax: 'ecmascript', jsx: true })
  const text = node =>
    bytes
      .subarray(
        node.span.start - ast.span.start,
        node.span.end - ast.span.start,
      )
      .toString()
  const completion = find(
    ast,
    node =>
      node.type === 'VariableDeclarator' && node.id.value === 'completionColor',
  )
  assert.ok(completion, `${path} has a theme-aware completion color`)
  const variables = {
    ...context,
    completionColor: vm.runInNewContext(text(completion.init), context),
  }
  const control = find(
    ast,
    node => node.type === 'JSXElement' && matches(node, text),
  )
  assert.ok(control, `${path} has the expected action control`)
  const color = attribute(control, 'color')?.value
  assert.ok(color, `${path} specifies its action color`)
  return color.type === 'StringLiteral'
    ? color.value
    : vm.runInNewContext(text(color.expression), variables)
}

test('task detail actions retain completion colors and warning pause state', () => {
  const view = source('views/ChoreEdit/ChoreView.jsx')
  assert.doesNotMatch(view, /color='success'/)
  for (const handler of [
    'handleApproveChore',
    'handleTaskCompletion',
    'handleChoreStart',
  ]) {
    assert.ok(view.includes(handler))
  }
  for (const [skin, expected] of [
    ['default', 'success'],
    ['forest', 'primary'],
  ]) {
    for (const status of [0, 1, 2]) {
      assert.equal(
        actionColor(
          'views/ChoreEdit/TimerSplitButton.jsx',
          node => node.opening.name.value === 'ButtonGroup',
          { skin, chore: { status } },
        ),
        status === 1 ? 'warning' : expected,
      )
    }
    assert.equal(
      actionColor(
        'views/ChoreEdit/TimePassedCard.jsx',
        (node, text) => {
          const click = attribute(node, 'onClick')?.value?.expression
          return click && text(click).includes("handleAction('resume')")
        },
        { skin },
      ),
      expected,
    )
  }
})

test('cards preserve default green completion actions and custom theme accents', () => {
  for (const file of ['ChoreCard', 'CompactChoreCard']) {
    const card = source(`views/Chores/${file}.jsx`)
    assert.match(card, /const \{ skin \} = useThemeSkin\(\)/)
    assert.match(
      card,
      /const completionColor = skin === 'default' \? 'success' : 'primary'/,
    )
    assert.match(
      card,
      /color=\{chore.status === 0 \? completionColor : 'warning'\}/,
    )
    assert.match(
      card,
      /color=\{completionColor\}[\s\S]*?onAction\('approve', chore\)/,
    )
  }
  assert.match(
    source('views/Chores/ChoreCard.jsx'),
    /color='success'[\s\S]*?chore.points/,
  )
  for (const [skin, expected] of [
    ['default', 'success'],
    ['forest', 'primary'],
  ]) {
    assert.equal(
      actionColor(
        'views/Chores/components/MultiSelectToolbar.jsx',
        node =>
          attribute(node, 'onClick')?.value?.expression?.value === 'onComplete',
        { skin },
      ),
      expected,
    )
  }
  assert.match(
    source('views/Chores/ArchivedTasks.jsx'),
    /color='primary'\s+onClick=\{handleBulkRestore\}/,
  )
})

test('primary swipe actions use paired solid background and text tokens', () => {
  const swipe = source('views/Chores/components/ChoreSwipeActions.jsx')
  assert.equal(
    (
      swipe.match(/bgcolor='primary.solidBg'\s+color='primary.solidColor'/g) ||
      []
    ).length,
    4,
  )
  assert.doesNotMatch(swipe, /bgcolor='success.500'/)
  assert.match(swipe, /bgcolor='danger.600'/)
})

test('timer progress, timeline and live sessions follow the accent', () => {
  const timer = source('views/Timer/TimerDetails.jsx')
  assert.doesNotMatch(timer, /success[.']|pulse-success/)
  for (const token of [
    'primary.solidBg',
    'primary.solidHoverBg',
    'primary.solidActiveBg',
    'primary.outlinedBorder',
    'primary.plainColor',
  ]) {
    assert.ok(timer.includes(token), `missing themed timer token: ${token}`)
  }
})

test('resume timer button and its pulse follow the accent', () => {
  const timer = source('views/Timer/TimerDetails.jsx')
  assert.match(timer, /color=\{isTimerRunning\(\) \? 'warning' : 'primary'\}/)
  assert.match(timer, /var\(--joy-palette-primary-solidBg\)/)
  assert.doesNotMatch(timer, /pulse-success|rgba\(76, 175, 80/)
})

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { URL } from 'node:url'

const source = path =>
  readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')

const assertCompletionColor = component => {
  assert.match(component, /const \{ skin \} = useThemeSkin\(\)/)
  assert.match(
    component,
    /const completionColor = skin === 'default' \? 'success' : 'primary'/,
  )
}

test('task detail actions retain their accent and timers follow the selected skin', () => {
  const view = source('views/ChoreEdit/ChoreView.jsx')
  assert.doesNotMatch(view, /color='success'/)
  for (const handler of [
    'handleApproveChore',
    'handleTaskCompletion',
    'handleChoreStart',
  ]) {
    assert.ok(view.includes(handler))
  }
  const splitButton = source('views/ChoreEdit/TimerSplitButton.jsx')
  assertCompletionColor(splitButton)
  assert.match(
    splitButton,
    /color=\{chore.status === 1 \? 'warning' : completionColor\}/,
  )
  const timePassed = source('views/ChoreEdit/TimePassedCard.jsx')
  assertCompletionColor(timePassed)
  assert.match(
    timePassed,
    /color=\{completionColor\}[\s\S]*?handleAction\('resume'\)/,
  )
})

test('cards preserve default green completion actions and custom theme accents', () => {
  for (const file of ['ChoreCard', 'CompactChoreCard']) {
    const card = source(`views/Chores/${file}.jsx`)
    assertCompletionColor(card)
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
  const toolbar = source('views/Chores/components/MultiSelectToolbar.jsx')
  assertCompletionColor(toolbar)
  assert.match(toolbar, /color=\{completionColor\}\s+onClick=\{onComplete\}/)
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

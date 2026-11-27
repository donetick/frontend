import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAssignmentRotation,
  canConfigureHandOff,
  canConfigureOrder,
  canConfigureRotation,
  getNextInRotation,
  normalizeAssignStrategy,
  reconcileRotationOrder,
  rotateToCurrent,
} from '../src/utils/AssignmentRotation.js'

const assignees = [42, 67, 91].map(userId => ({ userId }))
const build = (rotation, overrides) =>
  buildAssignmentRotation({
    strategy: 'round_robin',
    frequencyType: 'daily',
    assignees,
    rotation,
    ...overrides,
  })

test('uses the existing behavior unless a custom rule or order is set', () => {
  assert.equal(build(null), null)
  assert.equal(build({ mode: 'default' }), null)
  assert.deepEqual(build({ order: [91, 42, 67] }), {
    mode: 'default',
    order: [91, 42, 67],
  })
})

test('sends a count only for occurrence and completion modes', () => {
  assert.deepEqual(build({ mode: 'scheduled_occurrences', count: 3 }), {
    mode: 'scheduled_occurrences',
    count: 3,
  })
  assert.deepEqual(build({ mode: 'completions', count: 0 }), {
    mode: 'completions',
    count: 1,
  })
  assert.deepEqual(build({ mode: 'completions', count: 2000 }), {
    mode: 'completions',
    count: 1000,
  })
  assert.deepEqual(build({ mode: 'week', count: 4 }), {
    mode: 'week',
    weekday: 'monday',
  })
  assert.deepEqual(build({ mode: 'month', count: 4 }), {
    mode: 'month',
    dayOfMonth: 1,
  })
})

test('sends only the selected calendar anchor and normalizes invalid days', () => {
  assert.deepEqual(build({ mode: 'week', weekday: 'sunday', dayOfMonth: 31 }), {
    mode: 'week',
    weekday: 'sunday',
  })
  assert.deepEqual(
    build({ mode: 'month', weekday: 'sunday', dayOfMonth: 31 }),
    {
      mode: 'month',
      dayOfMonth: 31,
    },
  )
  assert.deepEqual(build({ mode: 'week', weekday: 'invalid' }), {
    mode: 'week',
    weekday: 'monday',
  })
  assert.deepEqual(build({ mode: 'month', dayOfMonth: 32 }), {
    mode: 'month',
    dayOfMonth: 1,
  })
})

test('keeps a Random timing rule but drops any Round robin order', () => {
  const overrides = { strategy: 'random_except_last_assigned' }
  assert.deepEqual(
    build(
      { mode: 'week', weekday: 'wednesday', order: [91, 67, 42] },
      overrides,
    ),
    {
      mode: 'week',
      weekday: 'wednesday',
    },
  )
  assert.equal(build({ mode: 'default', order: [91, 67, 42] }, overrides), null)
})

test('drops removed and duplicate IDs and appends new assignees', () => {
  assert.deepEqual(
    reconcileRotationOrder([91, 91, 5, 42], assignees),
    [91, 42, 67],
  )
  assert.deepEqual(build({ mode: 'month', order: [91, 42] }), {
    mode: 'month',
    dayOfMonth: 1,
    order: [91, 42, 67],
  })
})

test('previews the next turn from the current assignee and wraps around', () => {
  const order = [91, 42, 67]
  assert.equal(getNextInRotation(order, 42), 67)
  assert.equal(getNextInRotation(order, 67), 91)
  assert.equal(getNextInRotation(order, 100), 91)
})

test('lists the rotation starting from the current assignee', () => {
  assert.deepEqual(rotateToCurrent([42, 67, 91], 67), [67, 91, 42])
  assert.deepEqual(rotateToCurrent([42, 67, 91], 42), [42, 67, 91])
  assert.deepEqual(rotateToCurrent([42, 67, 91], 5), [42, 67, 91])
})

test('rejects unsupported strategies, schedules, and undersized pools', () => {
  for (const frequencyType of [
    'once',
    'no_repeat',
    'always',
    'trigger',
    undefined,
  ]) {
    assert.equal(build({ mode: 'month' }, { frequencyType }), null)
  }
  assert.equal(
    build({ mode: 'month' }, { strategy: 'keep_last_assigned' }),
    null,
  )
  assert.equal(build({ mode: 'month' }, { strategy: 'random' }), null)
  assert.equal(canConfigureRotation('round_robin', 'daily', []), false)
  assert.equal(
    canConfigureRotation('round_robin', 'daily', [assignees[0], assignees[0]]),
    false,
  )
})

test('allows a Round robin order on unscheduled repeats, but no timing', () => {
  for (const frequencyType of ['always', 'trigger']) {
    assert.equal(
      canConfigureOrder('round_robin', frequencyType, assignees),
      true,
    )
    assert.equal(
      canConfigureHandOff('round_robin', frequencyType, assignees),
      false,
    )
    assert.deepEqual(
      build({ mode: 'month', order: [91, 42, 67] }, { frequencyType }),
      { mode: 'default', order: [91, 42, 67] },
    )
  }
  for (const frequencyType of ['once', 'no_repeat']) {
    assert.equal(build({ order: [91, 42, 67] }, { frequencyType }), null)
  }
  assert.equal(
    canConfigureOrder('random_except_last_assigned', 'daily', assignees),
    false,
  )
})

test('opens legacy Random tasks as Random excluding the last assignee', () => {
  assert.equal(normalizeAssignStrategy('random'), 'random_except_last_assigned')
  assert.equal(normalizeAssignStrategy('round_robin'), 'round_robin')
  assert.equal(normalizeAssignStrategy(undefined), undefined)
})

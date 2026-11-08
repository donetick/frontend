import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'
import moment from 'moment'

import { evaluateCondition } from '../src/utils/FilterEngine.js'

// Load the complete native modules, including their actual colors and Moment
// dependency. Only the clock and timezone are controlled; no grouping is mocked.
const loadModule = (path, dependencies = {}) => {
  const { code } = transformSync(
    readFileSync(new URL(path, import.meta.url), 'utf8'),
    {
      jsc: { parser: { syntax: 'ecmascript' }, target: 'es2022' },
      module: { type: 'commonjs' },
    },
  )
  const exports = {}
  vm.runInNewContext(code, {
    Date,
    exports,
    require: name => {
      if (Object.hasOwn(dependencies, name)) return dependencies[name]
      throw new Error(`Unexpected import: ${name}`)
    },
  })
  return exports
}

const task = (id, nextDueDate, status = 0) => ({
  id,
  name: `Task ${id}`,
  priority: 0,
  status,
  nextDueDate,
  labelsV2: [],
})

const withClock = (t, now, callback, timezone = 'America/New_York') => {
  const oldTimezone = process.env.TZ
  process.env.TZ = timezone
  t.after(() => {
    if (oldTimezone === undefined) delete process.env.TZ
    else process.env.TZ = oldTimezone
  })
  t.mock.timers.enable({ apis: ['Date'], now: new Date(now) })
  const colors = loadModule('../src/utils/Colors.jsx')
  const { ChoresGrouper } = loadModule('../src/utils/Chores.jsx', {
    moment,
    './Colors.jsx': colors,
  })
  callback(ChoresGrouper)
}

for (const [name, now, due] of [
  [
    'fall-back morning',
    '2026-11-01T00:30:00-04:00',
    '2026-11-02T09:00:00-05:00',
  ],
  [
    'spring-forward eve',
    '2026-03-07T23:30:00-05:00',
    '2026-03-08T09:00:00-04:00',
  ],
  ['ordinary day', '2026-11-04T12:00:00-05:00', '2026-11-05T09:00:00-05:00'],
  ['year boundary', '2026-12-31T23:30:00-05:00', '2027-01-01T09:00:00-05:00'],
]) {
  test(`smart grouping puts the next local calendar day in Tomorrow on ${name}`, t => {
    withClock(t, now, group => {
      const chore = task(1, due)
      // This existing independent date-filter path already models tomorrow
      // as a calendar day and is a cross-check, not the expected-result oracle.
      assert.equal(
        evaluateCondition(chore, {
          type: 'dueDate',
          operator: 'isDueTomorrow',
        }),
        true,
      )
      const groups = group('default', [chore])
      assert.equal(groups.length, 1)
      assert.equal(groups[0].name, 'Tomorrow')
      assert.equal(groups[0].content[0], chore)
    })
  })
}

test('spring-forward does not promote the day after tomorrow into Tomorrow', t => {
  withClock(t, '2026-03-07T23:30:00-05:00', group => {
    const chore = task(2, '2026-03-09T09:00:00-04:00')
    assert.equal(
      evaluateCondition(chore, { type: 'dueDate', operator: 'isDueTomorrow' }),
      false,
    )
    assert.equal(group('default', [chore])[0].name, 'Next 7 Days')
  })
})

test('smart grouping retains status precedence, today, overdue and anytime', t => {
  withClock(t, '2026-11-01T00:30:00-04:00', group => {
    const chores = [
      task(1, '2026-11-02T09:00:00-05:00', 1),
      task(2, '2026-11-02T09:00:00-05:00', 2),
      task(3, '2026-11-02T09:00:00-05:00', 3),
      task(4, '2026-11-01T09:00:00-05:00'),
      task(5, '2026-10-31T09:00:00-04:00'),
      task(6, null),
    ]
    const before = JSON.stringify(chores)
    assert.deepEqual(
      Array.from(group('default', chores), entry => ({
        name: entry.name,
        ids: Array.from(entry.content, chore => chore.id),
      })),
      [
        { name: 'Started', ids: [1, 2] },
        { name: 'Pending Approval', ids: [3] },
        { name: 'Overdue', ids: [5] },
        { name: 'Today', ids: [4] },
        { name: 'Anytime', ids: [6] },
      ],
    )
    assert.equal(JSON.stringify(chores), before)
  })
})

// The adjacent week group must accept early day-after-tomorrow tasks even
// when they are less than 24 elapsed hours away. Keep its rolling upper bound.
for (const [
  zone,
  now,
  tomorrowEnd,
  dayAfterStart,
  oldLowerBound,
  upperBound,
] of [
  [
    'America/New_York',
    '2026-03-07T23:30:00-05:00',
    '2026-03-08T23:59:59.999-04:00',
    '2026-03-09T00:00:00-04:00',
    '2026-03-09T00:30:00-04:00',
    '2026-03-16T00:30:00-04:00',
  ],
  [
    'Australia/Sydney',
    '2026-10-03T23:30:00+10:00',
    '2026-10-04T23:59:59.999+11:00',
    '2026-10-05T00:00:00+11:00',
    '2026-10-05T00:30:00+11:00',
    '2026-10-12T00:30:00+11:00',
  ],
  [
    'Australia/Lord_Howe',
    '2026-10-03T23:45:00+10:30',
    '2026-10-04T23:59:59.999+11:00',
    '2026-10-05T00:00:00+11:00',
    '2026-10-05T00:15:00+11:00',
    '2026-10-12T00:15:00+11:00',
  ],
]) {
  test(`smart grouping has no gap after Tomorrow in ${zone}`, t => {
    withClock(
      t,
      now,
      group => {
        const chores = [
          task(1, tomorrowEnd),
          task(2, dayAfterStart),
          task(3, oldLowerBound),
          task(4, new Date(+new Date(oldLowerBound) + 1).toISOString()),
          task(5, new Date(+new Date(upperBound) - 1).toISOString()),
          task(6, upperBound),
        ]
        const groups = group('default', chores)
        const memberships = Object.fromEntries(
          Array.from(groups).flatMap(entry =>
            Array.from(entry.content, chore => [chore.id, entry.name]),
          ),
        )
        assert.deepEqual(memberships, {
          1: 'Tomorrow',
          2: 'Next 7 Days',
          3: 'Next 7 Days',
          4: 'Next 7 Days',
          5: 'Next 7 Days',
          6: 'Later This Month',
        })
      },
      zone,
    )
  })

  test(`week grouping retains status and missing-date behavior in ${zone}`, t => {
    withClock(
      t,
      now,
      group => {
        const chores = [
          task(1, dayAfterStart, 1),
          task(2, dayAfterStart, 2),
          task(3, dayAfterStart, 3),
          task(4, null),
          task(5, undefined),
          task(6, 'invalid-date'),
          task(7, new Date(Date.now() - 1).toISOString()),
          task(8, now),
        ]
        const snapshot = JSON.stringify(chores)
        const memberships = Object.fromEntries(
          Array.from(group('default', chores)).flatMap(entry =>
            Array.from(entry.content, chore => [chore.id, entry.name]),
          ),
        )
        assert.deepEqual(memberships, {
          1: 'Started',
          2: 'Started',
          3: 'Pending Approval',
          4: 'Anytime',
          5: 'Future',
          6: 'Future',
          7: 'Overdue',
          8: 'Today',
        })
        assert.equal(JSON.stringify(chores), snapshot)
      },
      zone,
    )
  })
}

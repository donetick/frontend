import assert from 'node:assert/strict'
import test from 'node:test'

import { evaluateCondition } from '../src/utils/FilterEngine.js'

const localTimestamp = (year, month, day, hour = 12) =>
  new Date(year, month - 1, day, hour).toISOString()

const evaluate = (createdAt, operator, value = '2025-03-10') =>
  evaluateCondition(
    { createdAt },
    { type: 'createdDate', operator, value },
  )

test('created-date before, during, and after compare whole local calendar days', () => {
  const before = localTimestamp(2025, 3, 9, 23)
  const during = localTimestamp(2025, 3, 10, 23)
  const after = localTimestamp(2025, 3, 11)

  assert.equal(evaluate(before, 'before'), true)
  assert.equal(evaluate(during, 'before'), false)
  assert.equal(evaluate(during, 'during'), true)
  assert.equal(evaluate(after, 'during'), false)
  assert.equal(evaluate(during, 'after'), false)
  assert.equal(evaluate(after, 'after'), true)
})

test('multiple created-date operators match any selected comparison', () => {
  const condition = {
    type: 'createdDate',
    operator: 'anyOf',
    value: [
      { operator: 'before', value: '2025-03-10' },
      { operator: 'after', value: '2025-03-10' },
    ],
  }

  assert.equal(
    evaluateCondition(
      { createdAt: localTimestamp(2025, 3, 9) },
      condition,
    ),
    true,
  )
  assert.equal(
    evaluateCondition(
      { createdAt: localTimestamp(2025, 3, 10) },
      condition,
    ),
    false,
  )
})

test('created-date filtering supports snake-case timestamps and rejects missing or invalid dates', () => {
  assert.equal(
    evaluateCondition(
      { created_at: localTimestamp(2025, 3, 10) },
      { type: 'createdDate', operator: 'during', value: '2025-03-10' },
    ),
    true,
  )
  assert.equal(evaluate(undefined, 'during'), false)
  assert.equal(evaluate(localTimestamp(2025, 3, 10), 'during', '2025-02-30'), false)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applyFilter, validateFilter } from '../src/utils/FilterEngine.js'

const context = { userId: 7, members: [{ userId: 42 }] }
const filter = value => ({
  conditions: [{ type: 'assignee', operator: 'is', value }],
})

for (const sentinel of ['me', 'others', 'anyone', 'available_for_me']) {
  test(`validates saved multi-select scope ${sentinel}`, () => {
    assert.equal(validateFilter(filter([sentinel]), context).isValid, true)
    assert.equal(validateFilter(filter([sentinel, 42]), context).isValid, true)
    assert.equal(validateFilter(filter(sentinel), context).isValid, true)
  })
}

test('available-to-me multi-select retains matching chores after validation', () => {
  const saved = filter(['available_for_me', 42])
  const chores = [
    { id: 1, assignedTo: 0 },
    { id: 2, assignedTo: 7 },
    { id: 3, assignedTo: 42 },
    { id: 4, assignedTo: 99 },
  ]
  const validation = validateFilter(saved, context)
  assert.equal(validation.isValid, true)
  assert.deepEqual(validation.issues, [])
  assert.deepEqual(
    applyFilter(chores, saved, context).map(c => c.id),
    [1, 2, 3],
  )
})

test('real member references still require an existing member', () => {
  assert.equal(validateFilter(filter(42), context).isValid, true)
  assert.equal(validateFilter(filter([42]), context).isValid, true)
  assert.equal(
    validateFilter(filter([42]), { members: [{ id: 42 }] }).isValid,
    true,
  )
  assert.equal(validateFilter(filter([99]), context).isValid, false)
  assert.equal(
    validateFilter(filter(['available_for_me', 99]), context).isValid,
    false,
  )
  assert.equal(validateFilter(filter(['anyone', 99]), context).isValid, false)
  assert.equal(validateFilter(filter(['not_a_scope']), context).isValid, false)
  assert.equal(
    validateFilter(filter(['available_for_me', 42]), { members: [] }).isValid,
    false,
  )
})

test('exclude operator preserves scope validation and matching', () => {
  const saved = {
    conditions: [
      { type: 'assignee', operator: 'isNot', value: ['available_for_me', 42] },
    ],
  }
  assert.equal(validateFilter(saved, context).isValid, true)
  assert.deepEqual(
    applyFilter(
      [
        { id: 1, assignedTo: 7 },
        { id: 2, assignedTo: 99 },
      ],
      saved,
      context,
    ).map(c => c.id),
    [2],
  )
})

test('unrelated validation remains intact', () => {
  assert.equal(validateFilter({ conditions: [] }, context).isValid, false)
  assert.equal(
    validateFilter(
      { conditions: [{ type: 'label', value: [9] }] },
      { labels: [{ id: 9 }] },
    ).isValid,
    true,
  )
  assert.equal(
    validateFilter(
      { conditions: [{ type: 'label', value: [9] }] },
      { labels: [] },
    ).isValid,
    false,
  )
})

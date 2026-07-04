import { describe, expect, it } from 'vitest'
import { applyFilter, evaluateCondition } from './FilterEngine'

// FilterEngine decides which chores a user sees — business-critical, pure logic.
// High value, non-brittle. See TESTING.md.

const chore = (overrides = {}) => ({
  id: 1,
  assignedTo: 10,
  assignees: [{ userId: 10 }],
  priority: 2,
  status: 0,
  ...overrides,
})

describe('evaluateCondition — priority', () => {
  it('matches when priority is in the set', () => {
    expect(
      evaluateCondition(chore({ priority: 1 }), { type: 'priority', operator: 'is', value: [1, 2] }),
    ).toBe(true)
  })

  it('does not match when priority is excluded', () => {
    expect(
      evaluateCondition(chore({ priority: 3 }), { type: 'priority', operator: 'is', value: [1, 2] }),
    ).toBe(false)
  })

  it('supports isNot', () => {
    expect(
      evaluateCondition(chore({ priority: 3 }), { type: 'priority', operator: 'isNot', value: [1] }),
    ).toBe(true)
  })
})

describe('evaluateCondition — assignee "me"', () => {
  const context = { userId: 10 }

  it('matches a chore assigned to the current user', () => {
    expect(
      evaluateCondition(chore({ assignedTo: 10 }), { type: 'assignee', operator: 'is', value: 'me' }, context),
    ).toBe(true)
  })

  it('does not match a chore assigned to someone else', () => {
    expect(
      evaluateCondition(
        chore({ assignedTo: 99, assignees: [{ userId: 99 }] }),
        { type: 'assignee', operator: 'is', value: 'me' },
        context,
      ),
    ).toBe(false)
  })
})

describe('evaluateCondition — unknown type', () => {
  it('defaults to true (does not filter out) for unknown condition types', () => {
    expect(evaluateCondition(chore(), { type: 'nonsense', operator: 'is', value: 1 })).toBe(true)
  })
})

describe('applyFilter', () => {
  const chores = [
    chore({ id: 1, priority: 1 }),
    chore({ id: 2, priority: 2 }),
    chore({ id: 3, priority: 3 }),
  ]

  it('returns all chores when the filter is empty', () => {
    expect(applyFilter(chores, { conditions: [] })).toHaveLength(3)
    expect(applyFilter(chores, null)).toHaveLength(3)
  })

  it('AND requires every condition to match', () => {
    const result = applyFilter(chores, {
      operator: 'AND',
      conditions: [
        { type: 'priority', operator: 'is', value: [1, 2] },
        { type: 'status', operator: 'is', value: [0] },
      ],
    })
    expect(result.map(c => c.id)).toEqual([1, 2])
  })

  it('OR matches when at least one condition matches', () => {
    const result = applyFilter(chores, {
      operator: 'OR',
      conditions: [
        { type: 'priority', operator: 'is', value: [1] },
        { type: 'priority', operator: 'is', value: [3] },
      ],
    })
    expect(result.map(c => c.id)).toEqual([1, 3])
  })
})

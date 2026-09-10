import { describe, expect, it } from 'vitest'

import {
  CHORE_STATUS,
  completeChore,
  HISTORY_STATUS,
  skipChore,
  undoChore,
} from './completion'

const dailyChore = {
  id: 42,
  name: 'Water the plants',
  frequencyType: 'daily',
  frequency: 1,
  frequencyMetadata: { time: '2025-01-01T09:00:00Z' },
  nextDueDate: '2025-03-10T09:00:00Z',
  isActive: true,
  status: CHORE_STATUS.NO_STATUS,
  assignedTo: 7,
  points: 5,
}

describe('completeChore', () => {
  it('advances the due date for a recurring chore', () => {
    const { chore, historyEntry } = completeChore({
      chore: dailyChore,
      completedDate: '2025-03-10T09:30:00Z',
      completedBy: 7,
    })

    expect(chore.nextDueDate).toBe('2025-03-11T09:00:00.000Z')
    expect(chore.isActive).toBe(true)
    expect(chore.status).toBe(CHORE_STATUS.NO_STATUS)
    expect(historyEntry.status).toBe(HISTORY_STATUS.COMPLETED)
    // The history row records the due date the chore *had*, not the new one.
    expect(historyEntry.dueDate).toBe('2025-03-10T09:00:00.000Z')
    expect(historyEntry.points).toBe(5)
    expect(historyEntry.completedBy).toBe(7)
  })

  it('deactivates a one-shot chore', () => {
    const { chore, historyEntry } = completeChore({
      chore: { ...dailyChore, frequencyType: 'once' },
      completedDate: '2025-03-10T09:30:00Z',
    })

    expect(chore.nextDueDate).toBeNull()
    expect(chore.isActive).toBe(false)
    expect(historyEntry.status).toBe(HISTORY_STATUS.COMPLETED)
  })

  it('deactivates a trigger chore but still records the completion', () => {
    const { chore } = completeChore({
      chore: { ...dailyChore, frequencyType: 'trigger' },
      completedDate: '2025-03-10T09:30:00Z',
    })

    expect(chore.isActive).toBe(false)
    expect(chore.nextDueDate).toBeNull()
  })

  it('resets the running timer entry instead of creating a second row', () => {
    const started = {
      id: 900,
      choreId: 42,
      status: HISTORY_STATUS.STARTED,
      performedAt: null,
      createdAt: '2025-03-10T09:00:00Z',
    }

    const { historyEntry } = completeChore({
      chore: dailyChore,
      completedDate: '2025-03-10T09:30:00Z',
      history: [started],
      note: 'done',
    })

    expect(historyEntry.id).toBe(900)
    expect(historyEntry.status).toBe(HISTORY_STATUS.COMPLETED)
    expect(historyEntry.performedAt).toBe('2025-03-10T09:30:00.000Z')
    expect(historyEntry.notes).toBe('done')
  })

  it('parks a chore that requires approval without touching the due date', () => {
    const { chore, historyEntry } = completeChore({
      chore: { ...dailyChore, requireApproval: true },
      completedDate: '2025-03-10T09:30:00Z',
    })

    expect(chore.status).toBe(CHORE_STATUS.PENDING_APPROVAL)
    expect(chore.nextDueDate).toBe('2025-03-10T09:00:00Z')
    expect(historyEntry.status).toBe(HISTORY_STATUS.PENDING_APPROVAL)
  })

  it('flags subtasks for reset on recurring chores only', () => {
    const withSubtasks = { ...dailyChore, subTasks: [{ id: 1, name: 'a' }] }

    expect(
      completeChore({
        chore: withSubtasks,
        completedDate: '2025-03-10T09:30:00Z',
      }).resetSubtasks,
    ).toBe(true)

    expect(
      completeChore({
        chore: { ...withSubtasks, frequencyType: 'once' },
        completedDate: '2025-03-10T09:30:00Z',
      }).resetSubtasks,
    ).toBe(false)
  })

  it('uses recent history for adaptive chores', () => {
    const adaptive = {
      ...dailyChore,
      frequencyType: 'adaptive',
      nextDueDate: '2025-03-10T09:00:00Z',
    }

    const { chore } = completeChore({
      chore: adaptive,
      completedDate: '2025-03-10T09:00:00Z',
      history: [
        {
          performedAt: '2025-03-08T09:00:00Z',
          status: HISTORY_STATUS.COMPLETED,
        },
        {
          performedAt: '2025-03-06T09:00:00Z',
          status: HISTORY_STATUS.COMPLETED,
        },
      ],
    })

    // Two-day cadence in history, so roughly two days out.
    expect(chore.nextDueDate).toBe('2025-03-12T09:00:00.000Z')
  })
})

describe('skipChore', () => {
  it('schedules from the due date, not from the moment of the skip', () => {
    const weekly = {
      ...dailyChore,
      frequencyType: 'weekly',
      nextDueDate: '2025-03-10T09:00:00Z',
    }

    const { chore, historyEntry } = skipChore({
      chore: weekly,
      skippedAt: '2025-03-12T20:00:00Z',
    })

    expect(chore.nextDueDate).toBe('2025-03-17T09:00:00.000Z')
    expect(historyEntry.status).toBe(HISTORY_STATUS.SKIPPED)
    expect(historyEntry.performedAt).toBe('2025-03-12T20:00:00.000Z')
    expect(historyEntry.notes).toBeNull()
  })

  it('deactivates a one-shot chore', () => {
    const { chore } = skipChore({
      chore: { ...dailyChore, frequencyType: 'no_repeat' },
      skippedAt: '2025-03-12T20:00:00Z',
    })

    expect(chore.isActive).toBe(false)
    expect(chore.nextDueDate).toBeNull()
  })
})

describe('undoChore', () => {
  it('restores the due date the chore had before the completion', () => {
    const { historyEntry } = completeChore({
      chore: dailyChore,
      completedDate: '2025-03-10T09:30:00Z',
    })
    const completedChore = {
      ...dailyChore,
      nextDueDate: '2025-03-11T09:00:00.000Z',
    }

    const result = undoChore({
      chore: completedChore,
      history: [historyEntry],
    })

    expect(result.chore.nextDueDate).toBe(
      new Date(dailyChore.nextDueDate).toISOString(),
    )
    expect(result.chore.status).toBe(CHORE_STATUS.NO_STATUS)
    expect(result.removedHistoryId).toBe(historyEntry.id)
  })

  it('reactivates a one-shot chore that completion deactivated', () => {
    const { chore: completedChore, historyEntry } = completeChore({
      chore: { ...dailyChore, frequencyType: 'once' },
      completedDate: '2025-03-10T09:30:00Z',
    })
    expect(completedChore.isActive).toBe(false)

    const result = undoChore({
      chore: completedChore,
      history: [historyEntry],
    })

    expect(result.chore.isActive).toBe(true)
    // Restored to the due date the chore had before it completed, not null.
    expect(result.chore.nextDueDate).toBe(
      new Date(dailyChore.nextDueDate).toISOString(),
    )
  })

  it('undoes a skip the same way', () => {
    const weekly = { ...dailyChore, frequencyType: 'weekly' }
    const { chore: skippedChore, historyEntry } = skipChore({
      chore: weekly,
      skippedAt: '2025-03-12T20:00:00Z',
    })

    const result = undoChore({ chore: skippedChore, history: [historyEntry] })

    expect(result.chore.nextDueDate).toBe(
      new Date(weekly.nextDueDate).toISOString(),
    )
    expect(result.removedHistoryId).toBe(historyEntry.id)
  })

  it('returns null when there is nothing undoable', () => {
    expect(undoChore({ chore: dailyChore, history: [] })).toBeNull()

    const started = {
      id: 900,
      status: HISTORY_STATUS.STARTED,
      performedAt: null,
    }
    expect(undoChore({ chore: dailyChore, history: [started] })).toBeNull()
  })
})

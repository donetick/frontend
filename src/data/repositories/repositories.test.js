import { beforeEach, describe, expect, it } from 'vitest'

import { CHORE_STATUS, HISTORY_STATUS } from '../../domain/completion'
import { store } from '../store'
import { choreRepo } from './choreRepo'
import { filterRepo } from './filterRepo'
import { historyRepo } from './historyRepo'
import { labelRepo } from './labelRepo'
import { projectRepo } from './projectRepo'

beforeEach(async () => {
  await store.init()
  await store.clear()
})

describe('choreRepo', () => {
  const daily = {
    name: 'Water the plants',
    frequencyType: 'daily',
    frequency: 1,
    frequencyMetadata: { time: '2025-01-01T09:00:00Z' },
    nextDueDate: '2025-03-10T09:00:00Z',
  }

  it('creates a chore with a permanent local id and API-shaped defaults', async () => {
    const saved = await choreRepo.save(daily)

    expect(saved.id).toBeTruthy()
    expect(saved.isActive).toBe(true)
    expect(saved.status).toBe(CHORE_STATUS.NO_STATUS)
    expect(saved.labelsV2).toEqual([])

    const reloaded = await choreRepo.get(saved.id)
    expect(reloaded.name).toBe('Water the plants')
  })

  it('keeps the id stable across edits', async () => {
    const saved = await choreRepo.save(daily)
    const edited = await choreRepo.save({ ...saved, name: 'Water the ferns' })

    expect(edited.id).toBe(saved.id)
    expect(await choreRepo.all()).toHaveLength(1)
  })

  it('advances the due date and records history on complete', async () => {
    const saved = await choreRepo.save(daily)
    const completed = await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })

    expect(completed.nextDueDate).toBe('2025-03-11T09:00:00.000Z')
    expect(completed.isActive).toBe(true)

    const history = await historyRepo.forChore(saved.id)
    expect(history).toHaveLength(1)
    expect(history[0].status).toBe(HISTORY_STATUS.COMPLETED)
    expect(history[0].dueDate).toBe('2025-03-10T09:00:00.000Z')
  })

  it('archives a one-shot chore on completion', async () => {
    const saved = await choreRepo.save({ ...daily, frequencyType: 'once' })
    const completed = await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })

    expect(completed.isActive).toBe(false)
    expect(await choreRepo.all()).toHaveLength(0)
    expect(await choreRepo.archived()).toHaveLength(1)
  })

  it('schedules a skip from the due date', async () => {
    const saved = await choreRepo.save({
      ...daily,
      frequencyType: 'weekly',
    })
    const skipped = await choreRepo.skip(saved.id)

    expect(skipped.nextDueDate).toBe('2025-03-17T09:00:00.000Z')
    const history = await historyRepo.forChore(saved.id)
    expect(history[0].status).toBe(HISTORY_STATUS.SKIPPED)
  })

  it('reuses the running timer entry when completing a started chore', async () => {
    const saved = await choreRepo.save(daily)
    await choreRepo.start(saved.id)

    expect((await choreRepo.get(saved.id)).status).toBe(
      CHORE_STATUS.IN_PROGRESS,
    )

    await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })

    const history = await historyRepo.forChore(saved.id)
    expect(history).toHaveLength(1)
    expect(history[0].status).toBe(HISTORY_STATUS.COMPLETED)
    expect((await choreRepo.get(saved.id)).status).toBe(CHORE_STATUS.NO_STATUS)
  })

  it('records the elapsed timer duration on the completion history entry', async () => {
    const saved = await choreRepo.save(daily)
    await choreRepo.start(saved.id)

    // The session's `start` is real wall-clock time; completing 5 minutes
    // "later" only requires offsetting the completedDate we pass in, not
    // advancing the actual clock.
    const completedDate = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    await choreRepo.complete(saved.id, { completedDate })

    const history = await historyRepo.forChore(saved.id)
    expect(history[0].status).toBe(HISTORY_STATUS.COMPLETED)
    expect(history[0].duration).toBe(300)
  })

  it('closes a still-running session, counts it, then resets the timer for the next occurrence', async () => {
    const saved = await choreRepo.save(daily)
    await choreRepo.start(saved.id)
    await choreRepo.pause(saved.id)
    await choreRepo.start(saved.id)

    const completedDate = new Date(Date.now() + 4 * 60 * 1000).toISOString()
    await choreRepo.complete(saved.id, { completedDate })

    const history = await historyRepo.forChore(saved.id)
    expect(history[0].duration).toBeGreaterThanOrEqual(240)

    // The just-closed cycle's sessions live on the history entry now; the
    // chore itself should start its next occurrence with a clean timer.
    const completedChore = await choreRepo.get(saved.id)
    expect(completedChore.duration).toBe(0)
    expect(completedChore.timerPauseLog).toEqual([])
    expect(completedChore.timerStartTime).toBeNull()
    expect(await choreRepo.getTimer(saved.id)).toBeNull()
  })

  it('records work sessions across start/pause cycles for the timer page', async () => {
    const saved = await choreRepo.save(daily)

    expect(await choreRepo.getTimer(saved.id)).toBeNull()

    await choreRepo.start(saved.id)
    let timer = await choreRepo.getTimer(saved.id)
    expect(timer.pauseLog).toHaveLength(1)
    expect(timer.pauseLog[0].end).toBeNull()
    expect(timer.startTime).toBeTruthy()

    await choreRepo.pause(saved.id)
    timer = await choreRepo.getTimer(saved.id)
    expect(timer.pauseLog).toHaveLength(1)
    expect(timer.pauseLog[0].end).toBeTruthy()

    // Starting again opens a second session rather than reopening the first.
    await choreRepo.start(saved.id)
    timer = await choreRepo.getTimer(saved.id)
    expect(timer.pauseLog).toHaveLength(2)
    expect(timer.pauseLog[1].end).toBeNull()

    // Starting while already running is a no-op on the session log.
    await choreRepo.start(saved.id)
    timer = await choreRepo.getTimer(saved.id)
    expect(timer.pauseLog).toHaveLength(2)
  })

  it('resets and edits the timer session log', async () => {
    const saved = await choreRepo.save(daily)
    await choreRepo.start(saved.id)
    await choreRepo.pause(saved.id)

    const updated = await choreRepo.updateTimer(saved.id, {
      startTime: '2025-03-10T09:00:00.000Z',
      pauseLog: [
        {
          start: '2025-03-10T09:00:00.000Z',
          end: '2025-03-10T09:10:00.000Z',
          duration: 600,
          updatedBy: 0,
        },
      ],
    })
    expect(updated.duration).toBe(600)

    await choreRepo.resetTimer(saved.id)
    expect(await choreRepo.getTimer(saved.id)).toBeNull()
    expect((await choreRepo.get(saved.id)).status).toBe(CHORE_STATUS.NO_STATUS)
  })

  it('undoes a completion, restoring the due date and history', async () => {
    const saved = await choreRepo.save(daily)
    await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })

    const undone = await choreRepo.undo(saved.id)

    expect(undone.nextDueDate).toBe(new Date(daily.nextDueDate).toISOString())
    expect(undone.status).toBe(CHORE_STATUS.NO_STATUS)
    expect(await historyRepo.forChore(saved.id)).toHaveLength(0)
  })

  it('undo reactivates a one-shot chore and is a no-op with nothing to undo', async () => {
    const saved = await choreRepo.save({ ...daily, frequencyType: 'once' })
    await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })
    expect(await choreRepo.archived()).toHaveLength(1)

    const undone = await choreRepo.undo(saved.id)
    expect(undone.isActive).toBe(true)
    expect(await choreRepo.all()).toHaveLength(1)

    // Nothing left to undo — returns the chore unchanged rather than throwing.
    const second = await choreRepo.undo(saved.id)
    expect(second.id).toBe(saved.id)
  })

  it('resets subtask completion for a recurring chore', async () => {
    const saved = await choreRepo.save({
      ...daily,
      subTasks: [{ id: 's1', name: 'Front room', completedAt: null }],
    })
    await choreRepo.setSubtaskCompletion(saved.id, 's1', true)
    expect((await choreRepo.get(saved.id)).subTasks[0].completedAt).toBeTruthy()

    await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })
    expect((await choreRepo.get(saved.id)).subTasks[0].completedAt).toBeNull()
  })

  it('archives and unarchives', async () => {
    const saved = await choreRepo.save(daily)

    await choreRepo.archive(saved.id)
    expect(await choreRepo.all()).toHaveLength(0)
    expect(await choreRepo.all({ includeArchived: true })).toHaveLength(1)

    await choreRepo.unarchive(saved.id)
    expect(await choreRepo.all()).toHaveLength(1)
  })

  it('deletes a chore along with its history', async () => {
    const saved = await choreRepo.save(daily)
    await choreRepo.complete(saved.id, {
      completedDate: '2025-03-10T09:30:00Z',
    })

    await choreRepo.remove(saved.id)

    expect(await choreRepo.get(saved.id)).toBeNull()
    expect(await historyRepo.forChore(saved.id)).toHaveLength(0)
  })

  it('reschedules without recording a completion', async () => {
    const saved = await choreRepo.save(daily)
    const moved = await choreRepo.reschedule(saved.id, '2025-04-01T08:00:00Z')

    expect(moved.nextDueDate).toBe('2025-04-01T08:00:00.000Z')
    expect(await historyRepo.forChore(saved.id)).toHaveLength(0)
  })
})

describe('labelRepo', () => {
  it('creates, renames and propagates into chores', async () => {
    const label = await labelRepo.create({ name: 'Kitchen', color: '#ff0000' })
    const chore = await choreRepo.save({
      name: 'Dishes',
      frequencyType: 'once',
      labelsV2: [label],
    })

    await labelRepo.update({ ...label, name: 'Kitchen & Pantry' })

    const reloaded = await choreRepo.get(chore.id)
    expect(reloaded.labelsV2[0].name).toBe('Kitchen & Pantry')
    expect(reloaded.labelsV2[0].id).toBe(label.id)
  })

  it('removes the label from chores on delete', async () => {
    const label = await labelRepo.create({ name: 'Kitchen' })
    const chore = await choreRepo.save({
      name: 'Dishes',
      frequencyType: 'once',
      labelsV2: [label],
    })

    await labelRepo.remove(label.id)

    expect(await labelRepo.all()).toHaveLength(0)
    expect((await choreRepo.get(chore.id)).labelsV2).toEqual([])
  })

  it('finds chores by label', async () => {
    const label = await labelRepo.create({ name: 'Kitchen' })
    await choreRepo.save({
      name: 'Dishes',
      frequencyType: 'once',
      labelsV2: [label],
    })
    await choreRepo.save({ name: 'Laundry', frequencyType: 'once' })

    const found = await choreRepo.byLabel(label.id)
    expect(found.map(chore => chore.name)).toEqual(['Dishes'])
  })
})

describe('projectRepo', () => {
  it('orphans chores instead of deleting them', async () => {
    const project = await projectRepo.create({ name: 'Home' })
    const chore = await choreRepo.save({
      name: 'Dishes',
      frequencyType: 'once',
      projectId: project.id,
    })

    expect(await choreRepo.byProject(project.id)).toHaveLength(1)

    const result = await projectRepo.remove(project.id)

    expect(result.orphanedChores).toBe(1)
    expect(await projectRepo.all()).toHaveLength(0)
    expect((await choreRepo.get(chore.id)).projectId).toBeNull()
  })
})

describe('filterRepo', () => {
  it('creates, pins, and tracks usage of a saved filter', async () => {
    const filter = await filterRepo.create({
      name: 'Overdue mine',
      conditions: [{ field: 'status', value: 'overdue' }],
    })

    expect(filter.isPinned).toBe(false)
    expect(filter.usageCount).toBe(0)
    expect(await filterRepo.all()).toHaveLength(1)

    const pinned = await filterRepo.togglePin(filter.id)
    expect(pinned.isPinned).toBe(true)
    expect(await filterRepo.pinned()).toHaveLength(1)

    const used = await filterRepo.trackUsage(filter.id)
    expect(used.usageCount).toBe(1)
    expect(used.lastUsedAt).not.toBeNull()

    await filterRepo.remove(filter.id)
    expect(await filterRepo.all()).toHaveLength(0)
  })

  it('sorts byUsage descending', async () => {
    const low = await filterRepo.create({ name: 'Low' })
    const high = await filterRepo.create({ name: 'High' })
    await filterRepo.trackUsage(high.id)
    await filterRepo.trackUsage(high.id)
    await filterRepo.trackUsage(low.id)

    const sorted = await filterRepo.byUsage()
    expect(sorted.map(filter => filter.id)).toEqual([high.id, low.id])
  })
})

describe('historyRepo', () => {
  it('returns entries newest first and filters by recency', async () => {
    const chore = await choreRepo.save({
      name: 'Dishes',
      frequencyType: 'daily',
      frequency: 1,
      frequencyMetadata: { time: '2025-01-01T09:00:00Z' },
      nextDueDate: new Date().toISOString(),
    })

    await historyRepo.record(chore.id, {
      status: HISTORY_STATUS.COMPLETED,
      performedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    })
    await historyRepo.record(chore.id, {
      status: HISTORY_STATUS.COMPLETED,
      performedAt: new Date(Date.now() - 60 * 1000).toISOString(),
    })

    const all = await historyRepo.forChore(chore.id)
    expect(all).toHaveLength(2)
    expect(new Date(all[0].performedAt) > new Date(all[1].performedAt)).toBe(
      true,
    )

    expect(await historyRepo.recent(7)).toHaveLength(1)
  })

  it('updates and deletes entries', async () => {
    const chore = await choreRepo.save({
      name: 'Dishes',
      frequencyType: 'once',
    })
    const entry = await historyRepo.record(chore.id, {
      status: HISTORY_STATUS.COMPLETED,
      performedAt: new Date().toISOString(),
    })

    await historyRepo.update(entry.id, { notes: 'took a while' })
    expect((await historyRepo.forChore(chore.id))[0].notes).toBe('took a while')

    await historyRepo.remove(entry.id)
    expect(await historyRepo.forChore(chore.id)).toHaveLength(0)
  })
})

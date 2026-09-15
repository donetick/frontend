import { beforeEach, describe, expect, it, vi } from 'vitest'

import { historyRepo } from '../data/repositories/historyRepo'
import { labelRepo } from '../data/repositories/labelRepo'
import { projectRepo } from '../data/repositories/projectRepo'
import { COLLECTIONS, store } from '../data/store'
import { HISTORY_STATUS } from '../domain/completion'
import {
  ArchiveChore,
  CompleteSubTask,
  CreateChore,
  CreateFilter,
  GetChoreDetailById,
  MarkChoreComplete,
  SkipChore,
  UpdateDueDate,
} from '../utils/Fetcher'
import {
  CreateLabelRemote as CreateLabel,
  CreateProjectRemote as CreateProject,
} from '../utils/RemoteApi'
import { adoptLocalData } from './adopt'

vi.mock('../utils/Fetcher', () => ({
  ArchiveChore: vi.fn(),
  CompleteSubTask: vi.fn(),
  CreateChore: vi.fn(),
  CreateFilter: vi.fn(),
  GetChoreDetailById: vi.fn(),
  MarkChoreComplete: vi.fn(),
  SkipChore: vi.fn(),
  UpdateDueDate: vi.fn(),
}))

// Regression coverage for offline-first-review.md finding 1: mock at the real
// transport boundary adopt.js imports, not at Fetcher.
vi.mock('../utils/RemoteApi', () => ({
  CreateLabelRemote: vi.fn(),
  CreateProjectRemote: vi.fn(),
}))

const ok = body => ({
  ok: true,
  json: async () => body,
})

const fail = (message = 'server error') => ({
  ok: false,
  json: async () => ({ error: message }),
})

beforeEach(async () => {
  await store.init()
  await store.clear()

  ArchiveChore.mockResolvedValue(ok({ res: true }))
  CompleteSubTask.mockResolvedValue(ok({ res: true }))
  CreateFilter.mockResolvedValue(ok({ res: 900 }))
  GetChoreDetailById.mockResolvedValue(ok({ res: { subTasks: [] } }))
  MarkChoreComplete.mockResolvedValue(ok({ res: {} }))
  SkipChore.mockResolvedValue(ok({ res: {} }))
  UpdateDueDate.mockResolvedValue(ok({ res: {} }))
})

describe('adoptLocalData', () => {
  it('pushes labels, projects and chores in dependency order with remapped ids', async () => {
    const label = await labelRepo.create({ name: 'Home' })
    const project = await projectRepo.create({ name: 'Renovation' })
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Paint fence',
      labelsV2: [label],
      projectId: project.id,
      isActive: true,
    })

    CreateLabel.mockResolvedValue(ok({ res: { id: 501, name: 'Home' } }))
    CreateProject.mockResolvedValue(
      ok({ res: { id: 701, name: 'Renovation' } }),
    )
    CreateChore.mockResolvedValue(ok({ res: 301 }))

    const summary = await adoptLocalData()

    expect(summary.labels.pushed).toBe(1)
    expect(summary.projects.pushed).toBe(1)
    expect(summary.chores.pushed).toBe(1)

    const chorePayload = CreateChore.mock.calls[0][0]
    expect(chorePayload.labelsV2[0].id).toBe(501)
    expect(chorePayload.projectId).toBe(701)
    expect(chorePayload.id).toBeUndefined()

    const synced = await store.get(COLLECTIONS.CHORE, chore._id)
    expect(synced._serverId).toBe('301')
  })

  it('skips documents that already carry a server id', async () => {
    const label = await labelRepo.create({ name: 'Already synced' })
    await store.markSynced(COLLECTIONS.LABEL, label.id, 999)

    const summary = await adoptLocalData()

    expect(CreateLabel).not.toHaveBeenCalled()
    expect(summary.labels.skipped).toBe(1)
    expect(summary.labels.pushed).toBe(0)
  })

  it('records a per-item failure without stopping the rest of the collection', async () => {
    await labelRepo.create({ name: 'Bad' })
    await labelRepo.create({ name: 'Good' })

    CreateLabel.mockResolvedValueOnce(fail('rejected')).mockResolvedValueOnce(
      ok({ res: { id: 502 } }),
    )

    const summary = await adoptLocalData()

    expect(summary.labels.pushed).toBe(1)
    expect(summary.labels.failed).toHaveLength(1)
    expect(summary.labels.failed[0].error).toBe('rejected')
  })

  it('replays completed and skipped history oldest-first, then corrects the due date', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, {
      name: 'Water plants',
      nextDueDate: '2025-03-12T09:00:00.000Z',
      isActive: true,
    })

    await historyRepo.record(saved._id, {
      status: HISTORY_STATUS.SKIPPED,
      performedAt: '2025-03-10T09:00:00.000Z',
    })
    await historyRepo.record(saved._id, {
      status: HISTORY_STATUS.COMPLETED,
      performedAt: '2025-03-05T09:00:00.000Z',
      notes: 'done early',
    })

    CreateChore.mockResolvedValue(ok({ res: 42 }))

    const summary = await adoptLocalData()

    expect(summary.history.replayed).toBe(2)
    expect(MarkChoreComplete).toHaveBeenCalledWith(
      42,
      { note: 'done early' },
      '2025-03-05T09:00:00.000Z',
    )
    expect(SkipChore).toHaveBeenCalledWith(42)

    const completeOrder = MarkChoreComplete.mock.invocationCallOrder[0]
    const skipOrder = SkipChore.mock.invocationCallOrder[0]
    expect(completeOrder).toBeLessThan(skipOrder)

    expect(UpdateDueDate).toHaveBeenCalledWith(42, '2025-03-12T09:00:00.000Z')
  })

  it('does not replay history for a chore that was already adopted', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, {
      name: 'Already on the server',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, saved._id, 55)
    await historyRepo.record(saved._id, {
      status: HISTORY_STATUS.COMPLETED,
      performedAt: '2025-03-05T09:00:00.000Z',
    })

    const summary = await adoptLocalData()

    expect(summary.chores.skipped).toBe(1)
    expect(MarkChoreComplete).not.toHaveBeenCalled()
    expect(summary.history.replayed).toBe(0)
  })

  it('archives a chore on the server if it was archived locally', async () => {
    await store.put(COLLECTIONS.CHORE, {
      name: 'Old task',
      isActive: false,
    })
    CreateChore.mockResolvedValue(ok({ res: 7 }))

    await adoptLocalData()

    expect(ArchiveChore).toHaveBeenCalledWith(7)
  })

  it('reuses a matched server id instead of creating a duplicate label/project', async () => {
    const label = await labelRepo.create({ name: 'Home' })
    const project = await projectRepo.create({ name: 'Renovation' })

    const preview = {
      labels: { matchMap: new Map([[label.id, 501]]) },
      projects: { matchMap: new Map([[project.id, 701]]) },
    }

    const summary = await adoptLocalData({ preview })

    expect(CreateLabel).not.toHaveBeenCalled()
    expect(CreateProject).not.toHaveBeenCalled()
    expect(summary.labels.matched).toBe(1)
    expect(summary.labels.pushed).toBe(0)
    expect(summary.projects.matched).toBe(1)

    const syncedLabel = await store.get(COLLECTIONS.LABEL, label._id)
    expect(syncedLabel._serverId).toBe('501')
  })

  it('preserves local subtask ids and parentId references so the server can resolve nesting', async () => {
    await store.put(COLLECTIONS.CHORE, {
      name: 'Multi-step with nesting',
      isActive: true,
      subTasks: [
        { id: -1, name: 'Parent', parentId: null, completedAt: null },
        { id: -2, name: 'Child', parentId: -1, completedAt: null },
      ],
    })
    CreateChore.mockResolvedValue(ok({ res: 89 }))

    await adoptLocalData()

    const chorePayload = CreateChore.mock.calls[0][0]
    expect(chorePayload.subTasks).toEqual([
      { id: -1, name: 'Parent', parentId: null, completedAt: null },
      { id: -2, name: 'Child', parentId: -1, completedAt: null },
    ])
  })

  it('reapplies completed subtasks by position after fetching server-assigned ids', async () => {
    await store.put(COLLECTIONS.CHORE, {
      name: 'Multi-step',
      isActive: true,
      subTasks: [
        {
          id: 'local-1',
          name: 'Step 1',
          completedAt: '2025-03-01T00:00:00.000Z',
        },
        { id: 'local-2', name: 'Step 2', completedAt: null },
      ],
    })
    CreateChore.mockResolvedValue(ok({ res: 88 }))
    GetChoreDetailById.mockResolvedValue(
      ok({
        res: {
          subTasks: [
            { id: 9001, name: 'Step 1' },
            { id: 9002, name: 'Step 2' },
          ],
        },
      }),
    )

    await adoptLocalData()

    expect(CompleteSubTask).toHaveBeenCalledWith(
      9001,
      88,
      '2025-03-01T00:00:00.000Z',
    )
    expect(CompleteSubTask).toHaveBeenCalledTimes(1)
  })
})

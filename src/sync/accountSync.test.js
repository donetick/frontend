import { beforeEach, describe, expect, it, vi } from 'vitest'

import { isAccountLocalFirstEnabled } from '../data/accountLocalFirst'
import { isLocalMode } from '../data/appMode'
import { labelRepo } from '../data/repositories/labelRepo'
import { projectRepo } from '../data/repositories/projectRepo'
import { COLLECTIONS, store } from '../data/store'
import { HISTORY_STATUS } from '../domain/completion'
import { apiClient } from '../utils/ApiClient'
import {
  CreateChore,
  DeleteChore,
  DeleteChoreHistory,
  GetChoreHistory,
  MarkChoreComplete,
  SaveChore,
  SkipChore,
  UpdateChoreHistory,
} from '../utils/Fetcher'
import {
  CreateLabelRemote as CreateLabel,
  CreateProjectRemote as CreateProject,
  DeleteLabelRemote as DeleteLabel,
  DeleteProjectRemote as DeleteProject,
  UpdateLabelRemote as UpdateLabel,
  UpdateProjectRemote as UpdateProject,
} from '../utils/RemoteApi'
import { pull, push, sync } from './accountSync'

vi.mock('../utils/Fetcher', () => ({
  CreateChore: vi.fn(),
  DeleteChore: vi.fn(),
  DeleteChoreHistory: vi.fn(),
  GetChoreHistory: vi.fn(),
  MarkChoreComplete: vi.fn(),
  SaveChore: vi.fn(),
  SkipChore: vi.fn(),
  UpdateChoreHistory: vi.fn(),
}))

// Regression coverage for offline-first-review.md finding 1: these must be
// mocked at the real transport boundary the sync engine imports, not at
// Fetcher, or a routing bug that redirects them to the local repository
// would go undetected.
vi.mock('../utils/RemoteApi', () => ({
  CreateLabelRemote: vi.fn(),
  CreateProjectRemote: vi.fn(),
  DeleteLabelRemote: vi.fn(),
  DeleteProjectRemote: vi.fn(),
  UpdateLabelRemote: vi.fn(),
  UpdateProjectRemote: vi.fn(),
}))

vi.mock('../utils/ApiClient', () => ({
  apiClient: { get: vi.fn() },
}))

vi.mock('../data/accountLocalFirst', () => ({
  isAccountLocalFirstEnabled: vi.fn(),
}))

vi.mock('../data/appMode', () => ({
  isLocalMode: vi.fn(),
}))

const ok = body => ({ ok: true, json: async () => body })
const fail = (message = 'server error') => ({
  ok: false,
  json: async () => ({ error: message }),
})

beforeEach(async () => {
  await store.init()
  await store.clear()
  vi.clearAllMocks()
  isLocalMode.mockReturnValue(false)
  isAccountLocalFirstEnabled.mockReturnValue(true)
})

describe('accountSync push', () => {
  it('creates a new dirty label and marks it synced', async () => {
    const label = await labelRepo.create({ name: 'Home' })
    CreateLabel.mockResolvedValue(ok({ res: { id: 501 } }))

    const result = await push()

    expect(CreateLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Home' }),
    )
    expect(result.labels.pushed).toBe(1)
    const synced = await store.get(COLLECTIONS.LABEL, label._id)
    expect(synced._serverId).toBe('501')
    expect(synced._dirty).toBe(false)
  })

  it('updates an already-synced label with the numeric server id', async () => {
    const label = await labelRepo.create({ name: 'Home' })
    await store.markSynced(COLLECTIONS.LABEL, label._id, 501)
    await labelRepo.update({ id: label._id, name: 'Renamed' })
    UpdateLabel.mockResolvedValue(ok({ res: {} }))

    const result = await push()

    expect(UpdateLabel).toHaveBeenCalledWith(
      expect.objectContaining({ id: 501, name: 'Renamed' }),
    )
    expect(result.labels.updated).toBe(1)
  })

  it('deletes a tombstoned label that was already synced, then purges it locally', async () => {
    const label = await labelRepo.create({ name: 'Gone' })
    await store.markSynced(COLLECTIONS.LABEL, label._id, 501)
    await labelRepo.remove(label._id)
    DeleteLabel.mockResolvedValue(ok({}))

    await push()

    expect(DeleteLabel).toHaveBeenCalledWith(501)
    expect(
      await store.get(COLLECTIONS.LABEL, label._id, { includeDeleted: true }),
    ).toBeNull()
  })

  it('purges a tombstoned label that never reached the server without calling delete', async () => {
    const label = await labelRepo.create({ name: 'Local only' })
    await labelRepo.remove(label._id)

    await push()

    expect(DeleteLabel).not.toHaveBeenCalled()
    expect(
      await store.get(COLLECTIONS.LABEL, label._id, { includeDeleted: true }),
    ).toBeNull()
  })

  it('remaps a chore payload to already-pushed label/project server ids', async () => {
    const label = await labelRepo.create({ name: 'Urgent' })
    await store.markSynced(COLLECTIONS.LABEL, label._id, 501)
    const project = await projectRepo.create({ name: 'Home' })
    await store.markSynced(COLLECTIONS.PROJECT, project._id, 701)

    await store.put(COLLECTIONS.CHORE, {
      name: 'Paint fence',
      labelsV2: [{ id: label._id, name: 'Urgent' }],
      projectId: project._id,
      isActive: true,
    })
    CreateChore.mockResolvedValue(ok({ res: 301 }))

    await push()

    const payload = CreateChore.mock.calls[0][0]
    expect(payload.labelsV2[0].id).toBe(501)
    expect(payload.projectId).toBe(701)
  })

  it('pushes an update for an already-synced chore with its numeric server id', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Existing',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    await store.put(COLLECTIONS.CHORE, { ...chore, name: 'Renamed' })
    SaveChore.mockResolvedValue(ok({ res: {} }))

    const result = await push()

    expect(SaveChore).toHaveBeenCalledWith(
      expect.objectContaining({ id: 42, name: 'Renamed' }),
    )
    expect(result.chores.updated).toBe(1)
  })

  it('replays a new completed history entry via MarkChoreComplete and matches the server row', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Water plants',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    await store.put(COLLECTIONS.HISTORY, {
      choreId: chore._id,
      status: HISTORY_STATUS.COMPLETED,
      performedAt: '2025-03-05T09:00:00.000Z',
    })
    MarkChoreComplete.mockResolvedValue(ok({ res: {} }))
    // No matching row yet (pre-check, run before the replay call to guard
    // against retrying a completion the server already committed), then the
    // row the call itself created (post-check, to record its server id).
    GetChoreHistory.mockResolvedValueOnce(
      ok({ res: [] }),
    ).mockResolvedValueOnce(
      ok({
        res: [
          {
            id: 9001,
            status: HISTORY_STATUS.COMPLETED,
            performedAt: '2025-03-05T09:00:00.000Z',
          },
        ],
      }),
    )

    const result = await push()

    expect(MarkChoreComplete).toHaveBeenCalledWith(
      42,
      { note: null },
      '2025-03-05T09:00:00.000Z',
      undefined,
    )
    expect(result.history.replayed).toBe(1)
    const historyDocs = await store.all(COLLECTIONS.HISTORY)
    expect(historyDocs[0]._serverId).toBe('9001')
    expect(historyDocs[0]._dirty).toBe(false)
  })

  it('does not replay a completion the server already committed when the prior response was lost', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Water plants',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    await store.put(COLLECTIONS.HISTORY, {
      choreId: chore._id,
      status: HISTORY_STATUS.COMPLETED,
      performedAt: '2025-03-05T09:00:00.000Z',
    })
    // Simulates a previous sync attempt where MarkChoreComplete succeeded
    // server-side but the response never reached the client, so the local
    // history row is still dirty going into this retry.
    GetChoreHistory.mockResolvedValue(
      ok({
        res: [
          {
            id: 9001,
            status: HISTORY_STATUS.COMPLETED,
            performedAt: '2025-03-05T09:00:00.000Z',
          },
        ],
      }),
    )

    const result = await push()

    expect(MarkChoreComplete).not.toHaveBeenCalled()
    expect(result.history.replayed).toBe(1)
    const historyDocs = await store.all(COLLECTIONS.HISTORY)
    expect(historyDocs[0]._serverId).toBe('9001')
    expect(historyDocs[0]._dirty).toBe(false)
  })

  it('marks a replayed history entry synced even when no matching server row is found', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Water plants',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    await store.put(COLLECTIONS.HISTORY, {
      choreId: chore._id,
      status: HISTORY_STATUS.SKIPPED,
      performedAt: '2025-03-05T09:00:00.000Z',
    })
    SkipChore.mockResolvedValue(ok({ res: {} }))
    GetChoreHistory.mockResolvedValue(ok({ res: [] }))

    const result = await push()

    expect(SkipChore).toHaveBeenCalledWith(42)
    expect(result.history.replayed).toBe(1)
    const historyDocs = await store.all(COLLECTIONS.HISTORY)
    expect(historyDocs[0]._dirty).toBe(false)
    expect(historyDocs[0]._serverId).toBeNull()
  })

  it('does not replay a "started" timer history entry', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Timer chore',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    await store.put(COLLECTIONS.HISTORY, {
      choreId: chore._id,
      status: HISTORY_STATUS.STARTED,
      performedAt: '2025-03-05T09:00:00.000Z',
    })

    const result = await push()

    expect(MarkChoreComplete).not.toHaveBeenCalled()
    expect(SkipChore).not.toHaveBeenCalled()
    expect(result.history.replayed).toBe(0)
  })

  it('deletes an already-synced history entry server-side then purges it locally', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, {
      name: 'Water plants',
      isActive: true,
    })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    const entry = await store.put(COLLECTIONS.HISTORY, {
      choreId: chore._id,
      status: HISTORY_STATUS.COMPLETED,
      performedAt: '2025-03-05T09:00:00.000Z',
    })
    await store.markSynced(COLLECTIONS.HISTORY, entry._id, 9001)
    await store.remove(COLLECTIONS.HISTORY, entry._id)
    DeleteChoreHistory.mockResolvedValue(ok({}))

    await push()

    expect(DeleteChoreHistory).toHaveBeenCalledWith(42, 9001)
    expect(
      await store.get(COLLECTIONS.HISTORY, entry._id, { includeDeleted: true }),
    ).toBeNull()
  })

  it('records a per-item failure without stopping the rest of the collection', async () => {
    await labelRepo.create({ name: 'Bad' })
    await labelRepo.create({ name: 'Good' })
    CreateLabel.mockResolvedValueOnce(fail('rejected')).mockResolvedValueOnce(
      ok({ res: { id: 502 } }),
    )

    const result = await push()

    expect(result.labels.pushed).toBe(1)
    expect(result.labels.failed).toHaveLength(1)
    expect(result.labels.failed[0].error).toBe('rejected')
  })
})

describe('accountSync pull', () => {
  it('upserts a brand-new server chore under a deterministic local id', async () => {
    apiClient.get.mockResolvedValue(
      ok({
        changes: { chores: [{ id: 42, name: 'From server' }] },
        deletions: {},
        cursor: 10,
        hasMore: false,
      }),
    )

    await pull()

    const chore = await store.getByServerId(COLLECTIONS.CHORE, 42)
    expect(chore).toMatchObject({ name: 'From server', _serverId: '42' })
    expect(chore._dirty).toBe(false)
    expect(await store.getMeta('accountSyncCursor')).toBe(10)
  })

  it('updates an existing local doc in place, preserving its local id', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, { name: 'Old name' })
    await store.markSynced(COLLECTIONS.CHORE, chore._id, 42)
    apiClient.get.mockResolvedValue(
      ok({
        changes: { chores: [{ id: 42, name: 'New name' }] },
        deletions: {},
        cursor: 10,
        hasMore: false,
      }),
    )

    await pull()

    const updated = await store.get(COLLECTIONS.CHORE, chore._id)
    expect(updated.name).toBe('New name')
    const all = await store.all(COLLECTIONS.CHORE)
    expect(all).toHaveLength(1)
  })

  it('purges a server-deleted label without re-queuing it for push', async () => {
    const label = await labelRepo.create({ name: 'Gone' })
    await store.markSynced(COLLECTIONS.LABEL, label._id, 501)
    apiClient.get.mockResolvedValue(
      ok({
        changes: {},
        deletions: { labels: [501] },
        cursor: 5,
        hasMore: false,
      }),
    )

    await pull()

    expect(
      await store.get(COLLECTIONS.LABEL, label._id, { includeDeleted: true }),
    ).toBeNull()
    expect(await store.dirty(COLLECTIONS.LABEL)).toHaveLength(0)
  })

  it('pages through hasMore, advancing the cursor each request', async () => {
    apiClient.get
      .mockResolvedValueOnce(
        ok({
          changes: { projects: [{ id: 1, name: 'Page 1' }] },
          deletions: {},
          cursor: 5,
          hasMore: true,
        }),
      )
      .mockResolvedValueOnce(
        ok({
          changes: { projects: [{ id: 2, name: 'Page 2' }] },
          deletions: {},
          cursor: 10,
          hasMore: false,
        }),
      )

    await pull()

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/sync/changes?since=0')
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/sync/changes?since=5')
    expect(await store.getMeta('accountSyncCursor')).toBe(10)
    expect(await store.all(COLLECTIONS.PROJECT)).toHaveLength(2)
  })

  it('throws when the server responds with an error', async () => {
    apiClient.get.mockResolvedValue({ ok: false, status: 500 })
    await expect(pull()).rejects.toThrow('Delta sync failed: 500')
  })
})

describe('accountSync.sync gating', () => {
  it('is a no-op in local mode', async () => {
    isLocalMode.mockReturnValue(true)
    const result = await sync()
    expect(result).toBe(false)
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('is a no-op when the rollout flag is off', async () => {
    isAccountLocalFirstEnabled.mockReturnValue(false)
    const result = await sync()
    expect(result).toBe(false)
    expect(apiClient.get).not.toHaveBeenCalled()
  })

  it('pulls then pushes when enabled in account mode', async () => {
    apiClient.get.mockResolvedValue(
      ok({ changes: {}, deletions: {}, cursor: 0, hasMore: false }),
    )

    await sync()

    expect(apiClient.get).toHaveBeenCalled()
  })
})

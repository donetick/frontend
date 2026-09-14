/**
 * Phase 4 — account-mode local-first sync engine (see
 * `docs/offline-first-phase4-plan.md` §2). Runs only when
 * `isAccountLocalFirstEnabled()` is true; otherwise the legacy
 * SyncEngine/CommandQueue/OfflineDB path (`src/utils/SyncEngine.js`) still
 * owns account-mode sync.
 *
 * Unlike that legacy path, this one has no separate outbox: `store.dirty()`
 * *is* the outbox (see `src/data/store.js`). Push walks every dirty document
 * per collection in dependency order (label → project → chore → history) and
 * replays it against the matching Fetcher call; pull drains
 * `/sync/changes?since=cursor` (now 4 entity types after the backend PR that
 * extended it beyond chores+histories) and upserts into the same store local
 * mode already reads and writes.
 *
 * Conflict policy: pull before push, every cycle, so local writes are made
 * against the latest known server state before being pushed. No field-level
 * merge — a losing write on a genuine concurrent edit is corrected by the
 * next pull. See the plan doc for why this is an acceptable simplification.
 */

import { isAccountLocalFirstEnabled } from '../data/accountLocalFirst'
import { isLocalMode } from '../data/appMode'
import { COLLECTIONS, localIdForServerId, store } from '../data/store'
import { HISTORY_STATUS } from '../domain/completion'
import { apiClient } from '../utils/ApiClient'
import {
  CreateChore,
  CreateLabel,
  CreateProject,
  DeleteChore,
  DeleteChoreHistory,
  DeleteLabel,
  DeleteProject,
  GetChoreHistory,
  MarkChoreComplete,
  SaveChore,
  SkipChore,
  UpdateChoreHistory,
  UpdateLabel,
  UpdateProject,
} from '../utils/Fetcher'
import {
  buildChorePayload,
  describeFailure,
  idFromResponseBody,
  stripLocalFields,
} from './pushHelpers'

const CURSOR_META_KEY = 'accountSyncCursor'
const DELTA_PAGE_LIMIT_GUARD = 1000 // sanity cap on pull loop iterations

/** local id (label/project) -> server id, for every doc that has one. */
const serverIdMap = async collection => {
  const docs = await store.all(collection, { includeDeleted: true })
  const map = new Map()
  for (const doc of docs) {
    if (doc._serverId) map.set(doc._id, Number(doc._serverId))
  }
  return map
}

// ── push ──

/** label/project: generic create/update/delete against a matching Fetcher shape. */
const pushSimpleWritable = async (
  collection,
  { createFn, deleteFn, updateFn },
) => {
  const dirtyDocs = await store.dirty(collection)
  const result = { pushed: 0, updated: 0, removed: 0, failed: [] }

  for (const doc of dirtyDocs) {
    try {
      if (doc._deletedAt) {
        if (doc._serverId) {
          const resp = await deleteFn(Number(doc._serverId))
          if (resp && resp.ok === false) {
            throw new Error(
              await describeFailure(resp, `Failed to delete ${collection}`),
            )
          }
        }
        await store.purge(collection, [doc._id])
        result.removed += 1
        continue
      }

      if (!doc._serverId) {
        const resp = await createFn(stripLocalFields(doc))
        if (!resp?.ok) {
          throw new Error(
            await describeFailure(resp, `Server rejected ${collection}`),
          )
        }
        const serverId = idFromResponseBody(await resp.json())
        if (!serverId) throw new Error(`No id returned for ${collection}`)
        await store.markSynced(collection, doc._id, serverId)
        result.pushed += 1
      } else {
        const resp = await updateFn(doc)
        if (resp && resp.ok === false) {
          throw new Error(
            await describeFailure(resp, `Failed to update ${collection}`),
          )
        }
        await store.markSynced(collection, doc._id, doc._serverId)
        result.updated += 1
      }
    } catch (err) {
      result.failed.push({ id: doc._id, error: err.message })
    }
  }

  return result
}

const pushLabels = () =>
  pushSimpleWritable(COLLECTIONS.LABEL, {
    createFn: CreateLabel,
    updateFn: doc =>
      UpdateLabel({ ...stripLocalFields(doc), id: Number(doc._serverId) }),
    deleteFn: DeleteLabel,
  })

const pushProjects = () =>
  pushSimpleWritable(COLLECTIONS.PROJECT, {
    createFn: CreateProject,
    updateFn: doc =>
      UpdateProject(Number(doc._serverId), stripLocalFields(doc)),
    deleteFn: DeleteProject,
  })

const pushChores = async (labelIdMap, projectIdMap) => {
  const dirtyDocs = await store.dirty(COLLECTIONS.CHORE)
  const result = { pushed: 0, updated: 0, removed: 0, failed: [] }

  for (const doc of dirtyDocs) {
    try {
      if (doc._deletedAt) {
        if (doc._serverId) {
          const resp = await DeleteChore(Number(doc._serverId))
          if (resp && resp.ok === false) {
            throw new Error(
              await describeFailure(resp, 'Failed to delete chore'),
            )
          }
        }
        await store.purge(COLLECTIONS.CHORE, [doc._id])
        result.removed += 1
        continue
      }

      const payload = buildChorePayload(doc, labelIdMap, projectIdMap)
      if (!doc._serverId) {
        const resp = await CreateChore(payload)
        if (!resp?.ok) {
          throw new Error(await describeFailure(resp, 'Server rejected chore'))
        }
        const serverId = idFromResponseBody(await resp.json())
        if (!serverId) throw new Error('No chore id returned')
        await store.markSynced(COLLECTIONS.CHORE, doc._id, serverId)
        result.pushed += 1
      } else {
        const resp = await SaveChore({ ...payload, id: Number(doc._serverId) })
        if (resp && resp.ok === false) {
          throw new Error(await describeFailure(resp, 'Failed to update chore'))
        }
        await store.markSynced(COLLECTIONS.CHORE, doc._id, doc._serverId)
        result.updated += 1
      }
    } catch (err) {
      result.failed.push({ id: doc._id, error: err.message })
    }
  }

  return result
}

/**
 * History is not a generic CRUD collection on the server — there is no
 * `POST` that creates a bare history row (see `docs/offline-first-log.md`,
 * Phase 3 notes). A *new* local completion/skip (no `_serverId` yet) can
 * only be represented server-side by actually calling the completion/skip
 * endpoint, which recomputes `nextDueDate` and awards points itself — so it
 * is replayed the same way `adopt.js` replays history, not pushed as data.
 *
 * Edits/deletes of an *already-synced* history entry (annotating or
 * removing a past record) map cleanly to `UpdateChoreHistory`/
 * `DeleteChoreHistory` and are pushed as plain field updates.
 *
 * Known gap: if the post-replay match against `GetChoreHistory` can't find
 * the row the server just created (ambiguous performedAt/status match),
 * the local entry is marked synced anyway (to avoid replaying the
 * completion twice) but keeps no `_serverId` — the next pull then adds the
 * server's copy as a second, separate local row. Rare in practice (a
 * single-history-entry-per-action match), and safer than the alternative of
 * double-completing the chore server-side.
 */
/** Delete an already-synced history entry server-side, if its chore was ever synced. */
const deleteRemoteHistoryEntry = async doc => {
  if (!doc._serverId) return
  const chore = await store.get(COLLECTIONS.CHORE, doc.choreId, {
    includeDeleted: true,
  })
  if (!chore?._serverId) return
  const resp = await DeleteChoreHistory(
    Number(chore._serverId),
    Number(doc._serverId),
  )
  if (resp && resp.ok === false) {
    throw new Error(await describeFailure(resp, 'Failed to delete history'))
  }
}

const pushHistory = async () => {
  const dirtyDocs = await store.dirty(COLLECTIONS.HISTORY)
  const result = { replayed: 0, updated: 0, removed: 0, failed: [] }

  for (const doc of dirtyDocs) {
    try {
      if (doc._deletedAt) {
        await deleteRemoteHistoryEntry(doc)
        await store.purge(COLLECTIONS.HISTORY, [doc._id])
        result.removed += 1
        continue
      }

      const chore = await store.get(COLLECTIONS.CHORE, doc.choreId, {
        includeDeleted: true,
      })
      if (!chore?._serverId) {
        // Chore hasn't been pushed yet (should not happen — chores push
        // before history in the same cycle) or was deleted locally before
        // sync; retry next cycle.
        continue
      }

      if (!doc._serverId) {
        const isReplayable =
          doc.status === HISTORY_STATUS.COMPLETED ||
          doc.status === HISTORY_STATUS.SKIPPED
        if (!isReplayable) {
          // "started" (in-progress timer) entries have no server equivalent
          // to replay against; they resolve once the chore is completed.
          continue
        }

        const resp =
          doc.status === HISTORY_STATUS.SKIPPED
            ? await SkipChore(Number(chore._serverId))
            : await MarkChoreComplete(
                Number(chore._serverId),
                { note: doc.notes ?? doc.note ?? null },
                doc.performedAt,
              )
        if (resp && resp.ok === false) {
          throw new Error(
            await describeFailure(resp, 'Failed to replay history'),
          )
        }

        // Best-effort: find the row the server just created so future syncs
        // recognize it instead of re-pulling it as a new local doc.
        let serverHistoryId = null
        try {
          const historyResp = await GetChoreHistory(Number(chore._serverId))
          if (historyResp?.ok) {
            const body = await historyResp.json()
            const rows = body?.res ?? []
            const match = rows.find(
              row =>
                row.status === doc.status &&
                row.performedAt &&
                doc.performedAt &&
                new Date(row.performedAt).getTime() ===
                  new Date(doc.performedAt).getTime(),
            )
            serverHistoryId = match?.id ?? null
          }
        } catch {
          // Non-fatal — see the "known gap" note above.
        }

        if (serverHistoryId) {
          await store.markSynced(COLLECTIONS.HISTORY, doc._id, serverHistoryId)
        } else {
          await store.put(COLLECTIONS.HISTORY, doc, { dirty: false })
        }
        result.replayed += 1
      } else {
        const resp = await UpdateChoreHistory(
          Number(chore._serverId),
          Number(doc._serverId),
          stripLocalFields(doc),
        )
        if (resp && resp.ok === false) {
          throw new Error(
            await describeFailure(resp, 'Failed to update history'),
          )
        }
        await store.markSynced(COLLECTIONS.HISTORY, doc._id, doc._serverId)
        result.updated += 1
      }
    } catch (err) {
      result.failed.push({ id: doc._id, error: err.message })
    }
  }

  return result
}

export const push = async () => {
  const labels = await pushLabels()
  const projects = await pushProjects()
  const [labelIdMap, projectIdMap] = await Promise.all([
    serverIdMap(COLLECTIONS.LABEL),
    serverIdMap(COLLECTIONS.PROJECT),
  ])
  const chores = await pushChores(labelIdMap, projectIdMap)
  const history = await pushHistory()
  return { labels, projects, chores, history }
}

// ── pull ──

const STREAM_COLLECTION = {
  labels: COLLECTIONS.LABEL,
  projects: COLLECTIONS.PROJECT,
  chores: COLLECTIONS.CHORE,
  choreHistories: COLLECTIONS.HISTORY,
}

/** Upsert one server row into the matching collection, preserving any local id. */
const upsertServerRow = async (collection, row) => {
  const serverId = row.id ?? row.Id ?? row.ID
  if (serverId === null || typeof serverId === 'undefined') return

  const existing = await store.getByServerId(collection, serverId, {
    includeDeleted: true,
  })
  const localId = existing?._id ?? localIdForServerId(serverId)
  await store.put(
    collection,
    { ...row, _id: localId },
    { dirty: false, serverId },
  )
}

/**
 * A server-originated deletion is purged outright (hard delete), not
 * tombstoned via `store.remove()` — a tombstone sets `dirty: true`, which
 * would make the row reappear in the next `store.dirty()` push pass and
 * fire a redundant (or, once purged there, no-op) delete call against a
 * server row that's already gone.
 */
const removeByServerId = async (collection, serverId) => {
  const existing = await store.getByServerId(collection, serverId, {
    includeDeleted: true,
  })
  if (!existing) return
  await store.purge(collection, [existing._id])
}

export const pull = async () => {
  const cursor = (await store.getMeta(CURSOR_META_KEY, 0)) || 0
  let currentCursor = cursor
  let hasMore = true
  let iterations = 0

  while (hasMore) {
    iterations += 1
    if (iterations > DELTA_PAGE_LIMIT_GUARD) {
      throw new Error('accountSync.pull: exceeded max pagination iterations')
    }

    const response = await apiClient.get(`/sync/changes?since=${currentCursor}`)
    if (!response || !response.ok) {
      const error = new Error(
        response
          ? `Delta sync failed: ${response.status}`
          : 'Delta sync failed: no response',
      )
      error.status = response?.status
      throw error
    }

    const data = await response.json()

    for (const [streamKey, collection] of Object.entries(STREAM_COLLECTION)) {
      const rows = data.changes?.[streamKey] ?? []
      for (const row of rows) {
        await upsertServerRow(collection, row)
      }
    }

    for (const [streamKey, collection] of Object.entries(STREAM_COLLECTION)) {
      const deletedIds = data.deletions?.[streamKey] ?? []
      for (const id of deletedIds) {
        await removeByServerId(collection, id)
      }
    }

    if (data.cursor != null) currentCursor = data.cursor
    hasMore = !!data.hasMore
    await store.setMeta(CURSOR_META_KEY, currentCursor)
  }

  return { cursor: currentCursor }
}

// ── orchestration ──

let inFlight = null

/** Pull, then push — see module doc for why this order. No-ops outside account mode / flag off. */
export const sync = async () => {
  if (isLocalMode() || !isAccountLocalFirstEnabled()) return false
  if (inFlight) return inFlight

  inFlight = (async () => {
    await pull()
    const pushResult = await push()
    // A push can leave newly-synced local ids that reference server data
    // (e.g. a chore just created references labels pushed moments earlier);
    // nothing else the server changed as a *result* of this push (points,
    // recomputed due dates from replayed completions) is visible locally
    // until the next pull, which is intentionally left for the next cycle
    // rather than recursing here.
    return pushResult
  })().finally(() => {
    inFlight = null
  })

  return inFlight
}

export const _internal = { pushLabels, pushProjects, pushChores, pushHistory }

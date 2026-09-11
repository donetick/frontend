/**
 * Phase 3 — adoption: push a local-only device's data up to a freshly
 * signed-up-or-signed-in account (see `docs/offline-first-plan.md`, §4 Phase 3).
 *
 * This runs once, right after auth succeeds while the user was in local mode.
 * By the time it runs, `isLocalMode()` is already false (a token is present),
 * so every call below goes over the network, not back into the local
 * repositories.
 *
 * There is no bulk-import endpoint on `donetick-core` yet, so this replays
 * through the same per-entity REST endpoints the UI already uses:
 *
 *   labels → projects → chores → history (→ filters)
 *
 * Labels and projects have to exist before chores that reference them; a
 * chore has to exist before its history can be replayed against it. History
 * is the ugliest part: `POST /chores/:id/do` recomputes `nextDueDate` on the
 * server every time it's called, so completions/skips must be replayed
 * oldest-first, and the chore's final due date is corrected afterwards in
 * case the replay drifted from what the user actually saw locally (manual
 * reschedules, skips replayed without their original date, etc).
 *
 * Resumable and idempotent: every pushed document is recorded via
 * `store.markSynced()`, so a retry after a partial failure (network drop,
 * server error) only pushes what's still missing — nothing is deleted
 * locally, and nothing already carrying a `_serverId` is pushed twice.
 * History replay is the one exception: it only runs for a chore in the same
 * pass that chore was first created on the server, so a retry doesn't
 * replay history twice for a chore that adopted successfully before.
 */

import { historyRepo } from '../data/repositories/historyRepo'
import { COLLECTIONS, store } from '../data/store'
import { HISTORY_STATUS } from '../domain/completion'
import {
  ArchiveChore,
  CompleteSubTask,
  CreateChore,
  CreateFilter,
  CreateLabel,
  CreateProject,
  GetChoreDetailById,
  MarkChoreComplete,
  SkipChore,
  UpdateDueDate,
} from '../utils/Fetcher'

/** The server's create endpoints return either a bare id or a full entity. */
const idFromResponseBody = body => {
  const value = body?.res ?? body
  if (value === null || typeof value === 'undefined') return null
  if (typeof value === 'object') return value.id ?? value.Id ?? value.ID ?? null
  return value
}

const describeFailure = async (resp, fallback) => {
  try {
    const body = await resp.json()
    return body?.error || body?.message || fallback
  } catch {
    return fallback
  }
}

/** Strip the store's bookkeeping fields and the local UUID before sending. */
const stripLocalFields = doc => {
  const clean = { ...doc }
  delete clean.id
  delete clean._id
  delete clean._collection
  delete clean._serverId
  delete clean._updatedAt
  delete clean._deletedAt
  delete clean._dirty
  return clean
}

/**
 * Push every not-yet-synced document in a collection through a create call,
 * recording the server id it gets back.
 *
 * `matchMap` (local id -> existing server id) comes from `adoptionPreview.js`
 * — when a local doc matches an existing account row by name, it is recorded
 * as synced against that row instead of creating a duplicate.
 *
 * @returns {{ idMap: Map<string, string>, result: { pushed: number, matched: number, skipped: number, failed: Array } }}
 */
const pushSimpleCollection = async (
  collection,
  createFn,
  { buildPayload, matchMap } = {},
) => {
  const docs = await store.all(collection)
  const idMap = new Map()
  const result = { pushed: 0, matched: 0, skipped: 0, failed: [] }

  for (const doc of docs) {
    if (doc._serverId) {
      idMap.set(doc._id, doc._serverId)
      result.skipped += 1
      continue
    }

    const existingServerId = matchMap?.get(doc._id)
    if (existingServerId !== undefined) {
      await store.markSynced(collection, doc._id, existingServerId)
      idMap.set(doc._id, existingServerId)
      result.matched += 1
      continue
    }

    try {
      const payload = buildPayload ? buildPayload(doc) : stripLocalFields(doc)
      const resp = await createFn(payload)
      if (!resp?.ok) {
        throw new Error(
          await describeFailure(resp, `Server rejected ${collection}`),
        )
      }
      const serverId = idFromResponseBody(await resp.json())
      if (!serverId) throw new Error(`No id returned for ${collection}`)

      await store.markSynced(collection, doc._id, serverId)
      idMap.set(doc._id, serverId)
      result.pushed += 1
    } catch (err) {
      result.failed.push({ id: doc._id, error: err.message })
    }
  }

  return { idMap, result }
}

/** Remap a chore's embedded label objects and project reference to server ids. */
const buildChorePayload = (doc, labelIdMap, projectIdMap) => {
  const payload = stripLocalFields(doc)

  payload.labelsV2 = (doc.labelsV2 || []).map(label => ({
    ...label,
    id: labelIdMap.get(String(label.id)) ?? label.id,
  }))

  payload.projectId = doc.projectId
    ? (projectIdMap.get(String(doc.projectId)) ?? doc.projectId)
    : null

  // Local subtask ids are unique negative ints scoped to this chore (see
  // nextTempId in SubTask.jsx). The server uses them as temp keys to resolve
  // parentId references within the same create request, then reassigns real
  // ids — so they must be sent as-is, matching what the online create path
  // already does. Stripping them collapses every subtask's id to 0 server
  // side, breaking nested parent/child linkage.
  payload.subTasks = doc.subTasks || []

  return payload
}

/**
 * Best-effort: reapply state that `CreateChore` doesn't accept up front —
 * archive status and which subtasks are already complete. Matched by
 * position since subtask ids are reassigned by the server.
 */
const applyChoreState = async (localDoc, serverId) => {
  if (localDoc.isActive === false) {
    await ArchiveChore(serverId)
  }

  const completedIndexes = (localDoc.subTasks || [])
    .map((subTask, index) => (subTask.completedAt ? index : -1))
    .filter(index => index !== -1)
  if (!completedIndexes.length) return

  try {
    const detailResp = await GetChoreDetailById(serverId)
    if (!detailResp?.ok) return
    const detail = await detailResp.json()
    const serverSubTasks = detail?.res?.subTasks || []

    for (const index of completedIndexes) {
      const serverSubTask = serverSubTasks[index]
      if (!serverSubTask) continue
      await CompleteSubTask(
        serverSubTask.id,
        serverId,
        localDoc.subTasks[index].completedAt,
      )
    }
  } catch {
    // Subtask completion state is cosmetic here — losing it is not data loss,
    // the chore and its history still adopted correctly.
  }
}

/** Oldest-first completed/skipped entries; "started" timers don't replay. */
const replayableHistory = async localChoreId => {
  const entries = await historyRepo.forChore(localChoreId)
  return entries
    .filter(
      entry =>
        entry.status === HISTORY_STATUS.COMPLETED ||
        entry.status === HISTORY_STATUS.SKIPPED,
    )
    .sort(
      (a, b) =>
        new Date(a.performedAt ?? 0).getTime() -
        new Date(b.performedAt ?? 0).getTime(),
    )
}

/**
 * Replay a chore's history against the server copy, oldest first, then
 * correct the final due date in case the replay drifted from local state.
 *
 * @returns {number} entries successfully replayed
 */
const replayHistory = async (localChoreId, serverId, localChore) => {
  const entries = await replayableHistory(localChoreId)
  let replayed = 0

  for (const entry of entries) {
    const resp =
      entry.status === HISTORY_STATUS.SKIPPED
        ? await SkipChore(serverId)
        : await MarkChoreComplete(
            serverId,
            { note: entry.notes ?? entry.note ?? null },
            entry.performedAt,
          )

    // `Fetch()` returns a raw Response; stop replaying this chore's history
    // on the first failure rather than compounding a wrong due date further.
    if (resp && resp.ok === false) break
    replayed += 1
  }

  if (localChore.nextDueDate) {
    try {
      await UpdateDueDate(serverId, localChore.nextDueDate)
    } catch {
      // Best-effort correction; the chore already exists with its history.
    }
  }

  return replayed
}

const emptyResult = () => ({ pushed: 0, matched: 0, skipped: 0, failed: [] })

/**
 * Push every local document up to the now-authenticated account.
 *
 * @param {{ preview?: import('./adoptionPreview').previewAdoption extends (...a: any) => Promise<infer R> ? R : never }} [options]
 *   Pass the result of `previewAdoption()` so labels/projects that matched an
 *   existing account row by name are reused instead of duplicated. Omitting
 *   it falls back to "create everything" — used by callers that already ran
 *   their own dedup, and by tests.
 * @returns summary of what was pushed/matched/skipped/failed per collection,
 *   plus a `history.replayed` count.
 */
export const adoptLocalData = async ({ preview } = {}) => {
  const summary = {
    labels: emptyResult(),
    projects: emptyResult(),
    chores: emptyResult(),
    filters: emptyResult(),
    history: { replayed: 0, failed: [] },
  }

  const { idMap: labelIdMap, result: labelResult } = await pushSimpleCollection(
    COLLECTIONS.LABEL,
    CreateLabel,
    { matchMap: preview?.labels?.matchMap },
  )
  summary.labels = labelResult

  const { idMap: projectIdMap, result: projectResult } =
    await pushSimpleCollection(COLLECTIONS.PROJECT, CreateProject, {
      matchMap: preview?.projects?.matchMap,
    })
  summary.projects = projectResult

  const choreDocs = await store.all(COLLECTIONS.CHORE)
  const choreIdMap = new Map()
  const newlyPushedChoreIds = new Set()

  for (const doc of choreDocs) {
    if (doc._serverId) {
      choreIdMap.set(doc._id, doc._serverId)
      summary.chores.skipped += 1
      continue
    }

    try {
      const payload = buildChorePayload(doc, labelIdMap, projectIdMap)
      const resp = await CreateChore(payload)
      if (!resp?.ok) {
        throw new Error(await describeFailure(resp, 'Server rejected chore'))
      }
      const serverId = idFromResponseBody(await resp.json())
      if (!serverId) throw new Error('No chore id returned')

      await store.markSynced(COLLECTIONS.CHORE, doc._id, serverId)
      choreIdMap.set(doc._id, serverId)
      newlyPushedChoreIds.add(doc._id)
      summary.chores.pushed += 1

      await applyChoreState(doc, serverId)
    } catch (err) {
      summary.chores.failed.push({ id: doc._id, error: err.message })
    }
  }

  for (const doc of choreDocs) {
    if (!newlyPushedChoreIds.has(doc._id)) continue
    const serverId = choreIdMap.get(doc._id)
    try {
      summary.history.replayed += await replayHistory(doc._id, serverId, doc)
    } catch (err) {
      summary.history.failed.push({ choreId: doc._id, error: err.message })
    }
  }

  // Filters are self-contained; nothing else references them by id, so no
  // remap step is needed, only a create.
  const { result: filterResult } = await pushSimpleCollection(
    COLLECTIONS.FILTER,
    CreateFilter,
  )
  summary.filters = filterResult

  return summary
}

export default adoptLocalData

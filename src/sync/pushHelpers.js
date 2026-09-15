/**
 * Shared helpers for pushing local documents up to the server, used by both
 * `adopt.js` (one-time push on sign-up/sign-in) and `accountSync.js` (the
 * ongoing background push for Phase 4 local-first account mode). Extracted
 * from `adopt.js`, which was the first thing to need them — see
 * `docs/offline-first-phase4-plan.md` §2.
 */

import { store } from '../data/store'

/** The server's create endpoints return either a bare id or a full entity. */
export const idFromResponseBody = body => {
  const value = body?.res ?? body
  if (value === null || typeof value === 'undefined') return null
  if (typeof value === 'object') return value.id ?? value.Id ?? value.ID ?? null
  return value
}

export const describeFailure = async (resp, fallback) => {
  try {
    const body = await resp.json()
    return body?.error || body?.message || fallback
  } catch {
    return fallback
  }
}

/** Strip the store's bookkeeping fields and the local UUID before sending. */
export const stripLocalFields = doc => {
  const clean = { ...doc }
  delete clean.id
  delete clean._id
  delete clean._collection
  delete clean._serverId
  delete clean._updatedAt
  delete clean._deletedAt
  delete clean._dirty
  // Quarantined server snapshot from a pull that lost a conflict with an
  // unpushed local edit (accountSync.js `upsertServerRow`) — local-only
  // bookkeeping, never part of the server payload.
  delete clean._remoteConflict
  return clean
}

/**
 * Push every not-yet-synced document in a collection through a create call,
 * recording the server id it gets back.
 *
 * `matchMap` (local id -> existing server id) comes from `adoptionPreview.js`
 * — when a local doc matches an existing account row by name, it is recorded
 * as synced against that row instead of creating a duplicate. Only relevant
 * to the one-time adoption push; ongoing sync never passes it.
 *
 * @returns {{ idMap: Map<string, string>, result: { pushed: number, matched: number, skipped: number, failed: Array } }}
 */
export const pushSimpleCollection = async (
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
export const buildChorePayload = (doc, labelIdMap, projectIdMap) => {
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

export const emptyResult = () => ({
  pushed: 0,
  matched: 0,
  skipped: 0,
  failed: [],
})

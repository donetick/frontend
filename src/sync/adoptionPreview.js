/**
 * Phase 3 — adoption preview: what pushing this device's local data into the
 * account just signed into would actually do (see
 * `docs/offline-first-plan.md`, §4 Phase 3, and `adopt.js`).
 *
 * Runs after auth succeeds, before `adoptLocalData()` writes anything. It only
 * reads the local store and the account's existing labels/projects, so it is
 * safe to show to the user and to re-run.
 *
 * Labels and projects are matched to existing account entities by exact name
 * (trimmed, case-insensitive) — the one place a duplicate is both likely
 * (same "Groceries" label invented independently on two devices) and safe to
 * resolve automatically: a match just means "reuse that id instead of
 * creating a new one", nothing is ever deleted or overwritten by it.
 */

import { COLLECTIONS, store } from '../data/store'
import { GetLabels, GetProjects } from '../utils/Fetcher'

const normalizeName = name => (name ?? '').trim().toLowerCase()

const liveUnsynced = async collection => {
  const docs = await store.all(collection)
  return docs.filter(doc => !doc._serverId)
}

/** Local docs in `collection` matched against the account's existing rows by name. */
const matchByName = async (collection, fetchExisting) => {
  const localDocs = await liveUnsynced(collection)

  let existing = []
  try {
    const body = await fetchExisting()
    // The API wraps results as `{ res: [...] }`, but `res` is `null` (not
    // `[]`) for an account with none of this collection yet — falling back
    // to `body` itself in that case would hand back the wrapper object, not
    // an array, so check shape explicitly rather than chain `??`.
    if (Array.isArray(body?.res)) existing = body.res
    else if (Array.isArray(body)) existing = body
  } catch {
    // Can't reach the account's existing rows — fall back to "no matches",
    // which just means everything gets created rather than reused. Never
    // blocks the preview.
    existing = []
  }

  const existingByName = new Map(
    existing.map(item => [normalizeName(item.name), item.id]),
  )

  const matchMap = new Map()
  for (const doc of localDocs) {
    const serverId = existingByName.get(normalizeName(doc.name))
    if (serverId !== undefined) matchMap.set(doc._id, serverId)
  }

  return {
    total: localDocs.length,
    new: localDocs.length - matchMap.size,
    matched: matchMap.size,
    matchMap,
    existingCount: existing.length,
  }
}

/**
 * @returns {Promise<{
 *   hasLocalData: boolean,
 *   accountHasExistingData: boolean,
 *   chores: { total: number },
 *   history: { total: number },
 *   filters: { total: number },
 *   labels: { total: number, new: number, matched: number, matchMap: Map, existingCount: number },
 *   projects: { total: number, new: number, matched: number, matchMap: Map, existingCount: number },
 * }>}
 */
export const previewAdoption = async () => {
  const [labels, projects, chores, history, filters] = await Promise.all([
    matchByName(COLLECTIONS.LABEL, GetLabels),
    matchByName(COLLECTIONS.PROJECT, GetProjects),
    liveUnsynced(COLLECTIONS.CHORE),
    liveUnsynced(COLLECTIONS.HISTORY),
    liveUnsynced(COLLECTIONS.FILTER),
  ])

  const hasLocalData =
    chores.length > 0 ||
    labels.total > 0 ||
    projects.total > 0 ||
    filters.length > 0

  return {
    hasLocalData,
    accountHasExistingData:
      labels.existingCount > 0 || projects.existingCount > 0,
    chores: { total: chores.length },
    history: { total: history.length },
    filters: { total: filters.length },
    labels,
    projects,
  }
}

export default previewAdoption

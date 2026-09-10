/**
 * Storage health: migrations, quota pressure and corruption recovery.
 *
 * In local-only mode the on-device database is the only copy of the user's
 * data, so the failure modes that would be a nuisance for a cache — Safari
 * evicting IndexedDB, a half-written record, a schema from a newer build — are
 * data loss here. This module is what the app calls at launch, and what the
 * diagnostics screen reads.
 */

import { isLocalMode } from './appMode'
import { runMigrations, SchemaTooNewError } from './migrations'
import { store } from './store'

/** Warn once the database is within this fraction of the browser's quota. */
const QUOTA_WARNING_RATIO = 0.8

let readyPromise = null

/**
 * Open the store and bring it up to the current schema. Idempotent and
 * coalesced, so every caller can await it without worrying about ordering.
 *
 * @returns {{ok: boolean, error?: Error, migration?: object}}
 */
export const ensureLocalStoreReady = () => {
  if (!readyPromise) {
    readyPromise = (async () => {
      try {
        await store.init()
        const migration = await runMigrations()
        return { ok: true, migration }
      } catch (error) {
        if (error instanceof SchemaTooNewError) {
          // Refusing is the safe move: an older build that "helpfully" wrote
          // to a newer schema would corrupt data it cannot represent.
          console.error(error.message)
          return { ok: false, error }
        }
        console.error('Local store failed to open', error)
        return { ok: false, error }
      }
    })()
  }
  return readyPromise
}

/** Forget the memoised readiness result — used after a restore or a reset. */
export const resetLocalStoreReady = () => {
  readyPromise = null
}

/**
 * Everything the storage diagnostics screen shows: row counts, footprint, and
 * whether the browser is close to evicting us.
 */
export const storageDiagnostics = async () => {
  await store.init()
  const stats = await store.stats()

  const quota = stats.quota ?? null
  const usage = stats.usage ?? null
  const ratio = quota && usage ? usage / quota : null

  return {
    ...stats,
    mode: isLocalMode() ? 'local' : 'account',
    quotaRatio: ratio,
    nearQuota: ratio !== null && ratio >= QUOTA_WARNING_RATIO,
    // Safari evicts IndexedDB from sites the user hasn't visited recently, and
    // only persistent storage is exempt.
    persisted: await isStoragePersisted(),
  }
}

/** Whether the browser has promised not to evict our data. */
export const isStoragePersisted = async () => {
  if (typeof navigator === 'undefined' || !navigator.storage?.persisted) {
    return null
  }
  try {
    return await navigator.storage.persisted()
  } catch {
    return null
  }
}

/**
 * Ask the browser for persistent storage. Chrome grants it silently based on
 * engagement; Safari and Firefox may prompt or refuse. Worth asking once the
 * user has committed to local-only mode, since eviction there loses real data.
 */
export const requestPersistentStorage = async () => {
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) {
    return null
  }
  try {
    return await navigator.storage.persist()
  } catch {
    return null
  }
}

/**
 * Count documents that failed to decode. `store.all` already skips them so one
 * bad row can't take down a collection; this is how the user finds out that it
 * happened.
 */
export const findCorruptDocuments = async () => {
  await store.init()
  const corrupt = []

  for (const collection of Object.keys(
    (await store.stats()).collections ?? {},
  )) {
    const rows = await store.backend.readAll(collection)
    const decoded = await store.all(collection, { includeDeleted: true })
    if (rows.length !== decoded.length) {
      const good = new Set(decoded.map(doc => doc._id))
      corrupt.push(
        ...rows
          .filter(row => !good.has(row.id))
          .map(row => ({ collection, id: row.id })),
      )
    }
  }

  return corrupt
}

/** Drop unreadable rows so they stop counting against quota. */
export const purgeCorruptDocuments = async () => {
  const corrupt = await findCorruptDocuments()
  const byCollection = new Map()
  for (const { collection, id } of corrupt) {
    if (!byCollection.has(collection)) byCollection.set(collection, [])
    byCollection.get(collection).push(id)
  }
  for (const [collection, ids] of byCollection) {
    await store.purge(collection, ids)
  }
  return corrupt.length
}

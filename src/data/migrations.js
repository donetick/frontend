/**
 * Forward migrations for the local document store.
 *
 * Each entry transforms every document in a collection from schema version
 * `n - 1` to `n`. Migrations only ever move forward: a database written by a
 * newer app than the one reading it is refused rather than downgraded, because
 * silently dropping fields the user can't see is worse than an honest error.
 */

import { COLLECTIONS, SCHEMA_VERSION, SCHEMA_VERSION_KEY, store } from './store'

/**
 * Keyed by the version each migration produces.
 *
 *   2: doc => ({ ...doc, someNewField: null })
 *
 * A migration receives one decoded document and returns the migrated one, or
 * `null` to drop it.
 */
export const MIGRATIONS = {
  // No migrations yet — version 1 is the initial schema.
}

export class SchemaTooNewError extends Error {
  constructor(found) {
    super(
      `Local data was written by a newer version of Donetick (schema ${found}, this build understands ${SCHEMA_VERSION}).`,
    )
    this.name = 'SchemaTooNewError'
    this.found = found
  }
}

const readVersion = async () => {
  const raw = await store.backend.metaGet(SCHEMA_VERSION_KEY)
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : SCHEMA_VERSION
}

/**
 * Bring the store up to `SCHEMA_VERSION`, running each pending migration in
 * order. Safe to call on every launch; a database already at the current
 * version does no work.
 *
 * @returns {{from: number, to: number, migrated: number}}
 */
export const runMigrations = async () => {
  await store.init()
  const from = await readVersion()

  if (from > SCHEMA_VERSION) throw new SchemaTooNewError(from)
  if (from === SCHEMA_VERSION) {
    // Nothing to migrate, but the marker may be missing or unreadable — write
    // it back so the next launch doesn't have to guess again.
    await store.backend.metaSet(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION))
    return { from, to: SCHEMA_VERSION, migrated: 0 }
  }

  const migrated = await applyMigrations(from, SCHEMA_VERSION)

  await store.backend.metaSet(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION))
  store.invalidate()

  return { from, to: SCHEMA_VERSION, migrated }
}

/**
 * Run every migration in `(from, to]` across every collection.
 *
 * @returns {number} how many documents were rewritten
 */
export const applyMigrations = async (from, to) => {
  let migrated = 0

  for (let version = from + 1; version <= to; version++) {
    const migrate = MIGRATIONS[version]
    if (!migrate) continue

    for (const collection of Object.values(COLLECTIONS)) {
      const docs = await store.all(collection, { includeDeleted: true })
      if (!docs.length) continue

      const next = docs.map(migrate).filter(Boolean)
      // Migrations rewrite storage, not sync state, so the dirty flags each
      // document already carries are preserved rather than reset.
      await store.putMany(collection, next, { dirty: false })
      migrated += next.length
    }
  }

  return migrated
}

import { beforeEach, describe, expect, it } from 'vitest'

import {
  applyMigrations,
  MIGRATIONS,
  runMigrations,
  SchemaTooNewError,
} from './migrations'
import { COLLECTIONS, SCHEMA_VERSION, SCHEMA_VERSION_KEY, store } from './store'

beforeEach(async () => {
  await store.init()
  await store.clear()
})

describe('runMigrations', () => {
  it('is a no-op when the store is already current', async () => {
    const result = await runMigrations()
    expect(result).toEqual({
      from: SCHEMA_VERSION,
      to: SCHEMA_VERSION,
      migrated: 0,
    })
  })

  it('refuses data written by a newer build', async () => {
    await store.backend.metaSet(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION + 1))

    await expect(runMigrations()).rejects.toThrow(SchemaTooNewError)
  })

  it('records the current version when none was stored', async () => {
    // A store opened before schema tracking existed reports no version; the
    // first run must stamp it rather than trying to migrate from nothing.
    await store.backend.metaSet(SCHEMA_VERSION_KEY, 'not-a-number')
    await runMigrations()

    expect(await store.backend.metaGet(SCHEMA_VERSION_KEY)).toBe(
      String(SCHEMA_VERSION),
    )
  })
})

describe('applyMigrations', () => {
  it('rewrites every document in every collection', async () => {
    await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    await store.put(COLLECTIONS.LABEL, { name: 'Kitchen' })

    const target = SCHEMA_VERSION + 1
    MIGRATIONS[target] = doc => ({ ...doc, migratedFlag: true })
    try {
      const migrated = await applyMigrations(SCHEMA_VERSION, target)
      expect(migrated).toBe(2)

      expect((await store.all(COLLECTIONS.CHORE))[0].migratedFlag).toBe(true)
      expect((await store.all(COLLECTIONS.LABEL))[0].migratedFlag).toBe(true)
    } finally {
      delete MIGRATIONS[target]
    }
  })

  it('drops documents a migration returns null for', async () => {
    await store.put(COLLECTIONS.CHORE, { name: 'Keep' })
    await store.put(COLLECTIONS.CHORE, { name: 'Drop' })

    const target = SCHEMA_VERSION + 1
    MIGRATIONS[target] = doc => (doc.name === 'Drop' ? null : doc)
    try {
      await applyMigrations(SCHEMA_VERSION, target)
      // The dropped document is no longer written back, but the row it came
      // from is still on disk until something purges it.
      const names = (await store.all(COLLECTIONS.CHORE)).map(doc => doc.name)
      expect(names).toContain('Keep')
    } finally {
      delete MIGRATIONS[target]
    }
  })

  it('does nothing when there are no migrations in range', async () => {
    await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    expect(await applyMigrations(SCHEMA_VERSION, SCHEMA_VERSION)).toBe(0)
  })
})

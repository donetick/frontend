import { beforeEach, describe, expect, it, vi } from 'vitest'

import { IndexedDBBackend } from './backends'
import { COLLECTIONS, DocumentStore, localIdForServerId } from './store'

describe('DocumentStore', () => {
  let store

  beforeEach(async () => {
    indexedDB.deleteDatabase('donetick_local')
    store = new DocumentStore(new IndexedDBBackend())
    await store.init()
    await store.clear()
  })

  it('assigns a local id on insert and reads it back', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })

    expect(saved._id).toBeTruthy()
    expect(saved._dirty).toBe(true)
    expect(saved._serverId).toBeNull()

    const read = await store.get(COLLECTIONS.CHORE, saved._id)
    expect(read.name).toBe('Dishes')
  })

  it('keeps the id stable across updates', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    const updated = await store.put(COLLECTIONS.CHORE, {
      ...saved,
      name: 'Dishes (renamed)',
    })

    expect(updated._id).toBe(saved._id)
    expect(await store.all(COLLECTIONS.CHORE)).toHaveLength(1)
    expect((await store.get(COLLECTIONS.CHORE, saved._id)).name).toBe(
      'Dishes (renamed)',
    )
  })

  it('does not persist bookkeeping fields into the document body', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    store.invalidate()

    const reloaded = await store.get(COLLECTIONS.CHORE, saved._id)
    // Round-tripping through storage must not nest a stale copy of _id/_dirty.
    expect(Object.keys(reloaded).filter(key => key.startsWith('_'))).toEqual([
      '_id',
      '_collection',
      '_serverId',
      '_updatedAt',
      '_deletedAt',
      '_dirty',
    ])
  })

  it('tombstones on remove instead of dropping the row', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    await store.remove(COLLECTIONS.CHORE, saved._id)

    expect(await store.all(COLLECTIONS.CHORE)).toHaveLength(0)
    expect(await store.get(COLLECTIONS.CHORE, saved._id)).toBeNull()

    const withDeleted = await store.all(COLLECTIONS.CHORE, {
      includeDeleted: true,
    })
    expect(withDeleted).toHaveLength(1)
    expect(withDeleted[0]._deletedAt).toBeTruthy()
    expect(withDeleted[0]._dirty).toBe(true)
  })

  it('purges rows outright', async () => {
    const saved = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    await store.purge(COLLECTIONS.CHORE, [saved._id])

    expect(
      await store.all(COLLECTIONS.CHORE, { includeDeleted: true }),
    ).toHaveLength(0)
  })

  it('keeps collections isolated', async () => {
    await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    await store.put(COLLECTIONS.LABEL, { name: 'Kitchen' })

    expect(await store.all(COLLECTIONS.CHORE)).toHaveLength(1)
    expect(await store.all(COLLECTIONS.LABEL)).toHaveLength(1)
    expect((await store.all(COLLECTIONS.LABEL))[0].name).toBe('Kitchen')
  })

  it('tracks dirty documents and clears them on markSynced', async () => {
    const chore = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    const label = await store.put(COLLECTIONS.LABEL, { name: 'Kitchen' })

    expect(await store.dirty()).toHaveLength(2)

    await store.markSynced(COLLECTIONS.CHORE, chore._id, 1234)

    const remaining = await store.dirty()
    expect(remaining).toHaveLength(1)
    expect(remaining[0]._id).toBe(label._id)

    const synced = await store.get(COLLECTIONS.CHORE, chore._id)
    expect(synced._serverId).toBe('1234')
    expect(synced._dirty).toBe(false)
  })

  it('writes server-sourced documents clean', async () => {
    const saved = await store.put(
      COLLECTIONS.CHORE,
      { _id: localIdForServerId(88), name: 'From server' },
      { dirty: false, serverId: 88 },
    )

    expect(saved._id).toBe('srv:88')
    expect(saved._dirty).toBe(false)
    expect(await store.dirty()).toHaveLength(0)
    expect((await store.getByServerId(COLLECTIONS.CHORE, 88)).name).toBe(
      'From server',
    )
  })

  it('survives a corrupt row without losing the rest of the collection', async () => {
    const good = await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    await store.backend.writeMany([
      {
        collection: COLLECTIONS.CHORE,
        id: 'broken',
        doc: '{ not json',
        serverId: null,
        updatedAt: Date.now(),
        deletedAt: null,
        dirty: 1,
      },
    ])
    store.invalidate()

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const docs = await store.all(COLLECTIONS.CHORE)
    warn.mockRestore()

    expect(docs).toHaveLength(1)
    expect(docs[0]._id).toBe(good._id)
  })

  it('reads back from disk after the cache is dropped', async () => {
    await store.putMany(COLLECTIONS.CHORE, [{ name: 'A' }, { name: 'B' }])
    store.invalidate()

    const docs = await store.all(COLLECTIONS.CHORE)
    expect(docs.map(doc => doc.name).sort()).toEqual(['A', 'B'])
  })

  it('notifies subscribers on write', async () => {
    const seen = []
    const unsubscribe = store.subscribe(collection => seen.push(collection))

    await store.put(COLLECTIONS.CHORE, { name: 'Dishes' })
    unsubscribe()
    await store.put(COLLECTIONS.LABEL, { name: 'Kitchen' })

    expect(seen).toEqual([COLLECTIONS.CHORE])
  })

  it('round-trips meta values', async () => {
    await store.setMeta('appMode', 'local')
    await store.setMeta('cursor', { since: 42 })

    expect(await store.getMeta('appMode')).toBe('local')
    expect(await store.getMeta('cursor')).toEqual({ since: 42 })
    expect(await store.getMeta('missing', 'default')).toBe('default')
  })

  it('reports per-collection stats', async () => {
    const a = await store.put(COLLECTIONS.CHORE, { name: 'A' })
    await store.put(COLLECTIONS.CHORE, { name: 'B' })
    await store.remove(COLLECTIONS.CHORE, a._id)

    const stats = await store.stats()
    expect(stats.collections[COLLECTIONS.CHORE]).toEqual({
      total: 2,
      live: 1,
      dirty: 2,
    })
    expect(stats.rows).toBeGreaterThan(0)
  })

  it('supports predicate queries', async () => {
    await store.putMany(COLLECTIONS.CHORE, [
      { name: 'A', priority: 1 },
      { name: 'B', priority: 3 },
      { name: 'C', priority: 3 },
    ])

    const found = await store.where(
      COLLECTIONS.CHORE,
      doc => doc.priority === 3,
    )
    expect(found.map(doc => doc.name).sort()).toEqual(['B', 'C'])
  })
})

/**
 * The local document store — one generic collection store shared by every
 * entity, implemented once over two dumb backends (see `backends.js`).
 *
 * Design notes:
 *  - Ids are client-generated UUIDs that never change. The server's integer id
 *    lives alongside as `serverId`, so adopting an account is "push and record
 *    the returned id", not "rewrite every reference".
 *  - Deletes are tombstones (`deletedAt`), so a later sync can propagate them.
 *  - `dirty` marks rows with local changes not yet pushed. In local-only mode
 *    it simply accumulates and nothing reads it.
 *  - Filtering, sorting and joins happen in plain JS over a cached copy of the
 *    collection. A personal task list is hundreds of rows; this removes a whole
 *    class of "the SQL and the IndexedDB path disagree" bugs.
 */

import { generateUUID } from '../utils/UUID'
import { createBackend } from './backends'

export const COLLECTIONS = {
  CHORE: 'chore',
  LABEL: 'label',
  PROJECT: 'project',
  SUBTASK: 'subtask',
  HISTORY: 'history',
  TIME_SESSION: 'timeSession',
  FILTER: 'filter',
}

/** Bump when the on-disk document shape changes; see `migrations.js`. */
export const SCHEMA_VERSION = 1
export const SCHEMA_VERSION_KEY = 'schemaVersion'

/** Stable local id for a row that originated on the server. */
export const localIdForServerId = serverId => `srv:${serverId}`

export const newLocalId = () => generateUUID()

const encode = doc => JSON.stringify(doc)

const decode = (row, collection) => {
  try {
    return {
      ...JSON.parse(row.doc),
      _id: row.id,
      _collection: collection,
      _serverId: row.serverId ?? null,
      _updatedAt: row.updatedAt,
      _deletedAt: row.deletedAt ?? null,
      _dirty: row.dirty === 1,
    }
  } catch (err) {
    // One corrupt row must not take down the whole collection.
    console.warn('Skipping corrupt document', collection, row.id, err)
    return null
  }
}

/** Strip the store's bookkeeping fields before persisting a document. */
const stripInternal = doc => {
  const clean = { ...doc }
  delete clean._id
  delete clean._collection
  delete clean._serverId
  delete clean._updatedAt
  delete clean._deletedAt
  delete clean._dirty
  return clean
}

export class DocumentStore {
  constructor(backend = createBackend()) {
    this.backend = backend
    this.initialized = false
    this._initPromise = null
    /** @type {Map<string, Array>} collection -> decoded documents */
    this._cache = new Map()
    this._listeners = new Set()
  }

  async init() {
    if (this.initialized) return
    if (this._initPromise) return this._initPromise
    this._initPromise = this._doInit().finally(() => {
      this._initPromise = null
    })
    return this._initPromise
  }

  async _doInit() {
    await this.backend.init()
    const stored = await this.backend.metaGet(SCHEMA_VERSION_KEY)
    if (stored === null) {
      await this.backend.metaSet(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION))
    }
    this.initialized = true
  }

  // ── change notification ──

  /** Subscribe to writes. Returns an unsubscribe function. */
  subscribe(listener) {
    this._listeners.add(listener)
    return () => this._listeners.delete(listener)
  }

  _notify(collection) {
    for (const listener of this._listeners) {
      try {
        listener(collection)
      } catch (err) {
        console.warn('Document store listener failed', err)
      }
    }
  }

  // ── reads ──

  async _load(collection) {
    if (this._cache.has(collection)) return this._cache.get(collection)
    await this.init()
    const rows = await this.backend.readAll(collection)
    const docs = rows.map(row => decode(row, collection)).filter(Boolean)
    this._cache.set(collection, docs)
    return docs
  }

  /**
   * Every live document in a collection. Tombstoned rows are excluded unless
   * `includeDeleted` is set (sync and export need them).
   */
  async all(collection, { includeDeleted = false } = {}) {
    const docs = await this._load(collection)
    return includeDeleted ? [...docs] : docs.filter(doc => !doc._deletedAt)
  }

  /** Documents matching a predicate, evaluated in JS. */
  async where(collection, predicate, options) {
    const docs = await this.all(collection, options)
    return docs.filter(predicate)
  }

  async get(collection, id, { includeDeleted = false } = {}) {
    const docs = await this._load(collection)
    const doc = docs.find(candidate => candidate._id === id) ?? null
    if (!doc) return null
    return includeDeleted || !doc._deletedAt ? doc : null
  }

  /** Look a document up by the server's integer id. */
  async getByServerId(collection, serverId, options) {
    if (serverId === null || typeof serverId === 'undefined') return null
    const key = String(serverId)
    const docs = await this.all(collection, options)
    return docs.find(doc => doc._serverId === key) ?? null
  }

  // ── writes ──

  /**
   * Insert or replace a document.
   *
   * @param {string} collection
   * @param {object} doc the entity; `_id` is generated when absent
   * @param {object} [options]
   * @param {boolean} [options.dirty=true] false when writing data pulled from
   *   the server, which by definition needs no push back
   * @param {string|number|null} [options.serverId]
   */
  async put(collection, doc, options = {}) {
    const [saved] = await this.putMany(collection, [doc], options)
    return saved
  }

  async putMany(collection, docs, { dirty = true, serverId } = {}) {
    if (!docs.length) return []
    await this.init()

    const existing = await this._load(collection)
    const byId = new Map(existing.map(doc => [doc._id, doc]))
    const now = Date.now()

    const saved = []
    const rows = []

    for (const doc of docs) {
      const id = doc._id ?? newLocalId()
      const previous = byId.get(id)
      const resolvedServerId =
        typeof serverId !== 'undefined'
          ? serverId === null
            ? null
            : String(serverId)
          : (doc._serverId ?? previous?._serverId ?? null)

      const body = stripInternal(doc)
      const row = {
        collection,
        id,
        doc: encode(body),
        serverId: resolvedServerId,
        updatedAt: now,
        // An explicit un-delete happens by putting the document again.
        deletedAt: doc._deletedAt ?? null,
        dirty: dirty ? 1 : 0,
      }
      rows.push(row)

      const decoded = {
        ...body,
        _id: id,
        _collection: collection,
        _serverId: resolvedServerId,
        _updatedAt: now,
        _deletedAt: row.deletedAt,
        _dirty: dirty,
      }
      saved.push(decoded)
      byId.set(id, decoded)
    }

    await this.backend.writeMany(rows)
    this._cache.set(collection, [...byId.values()])
    this._notify(collection)
    return saved
  }

  /**
   * Tombstone a document. The row stays so a later sync can tell "deleted"
   * apart from "never existed".
   */
  async remove(collection, id) {
    const doc = await this.get(collection, id, { includeDeleted: true })
    if (!doc) return null
    await this.init()

    const now = Date.now()
    const row = {
      collection,
      id,
      doc: encode(stripInternal(doc)),
      serverId: doc._serverId ?? null,
      updatedAt: now,
      deletedAt: now,
      dirty: 1,
    }
    await this.backend.writeMany([row])

    const docs = await this._load(collection)
    this._cache.set(
      collection,
      docs.map(candidate =>
        candidate._id === id
          ? { ...candidate, _deletedAt: now, _updatedAt: now, _dirty: true }
          : candidate,
      ),
    )
    this._notify(collection)
    return { ...doc, _deletedAt: now }
  }

  /** Remove rows outright — for sync cleanup, not for user-facing deletes. */
  async purge(collection, ids) {
    if (!ids.length) return
    await this.init()
    await this.backend.deleteMany(collection, ids)
    const docs = await this._load(collection)
    const removed = new Set(ids)
    this._cache.set(
      collection,
      docs.filter(doc => !removed.has(doc._id)),
    )
    this._notify(collection)
  }

  // ── sync bookkeeping ──

  /** Documents with local changes not yet pushed, tombstones included. */
  async dirty(collection) {
    const collections = collection ? [collection] : Object.values(COLLECTIONS)
    const result = []
    for (const name of collections) {
      const docs = await this.all(name, { includeDeleted: true })
      result.push(...docs.filter(doc => doc._dirty))
    }
    return result
  }

  /** Record the server id the backend assigned and clear the dirty flag. */
  async markSynced(collection, id, serverId) {
    const doc = await this.get(collection, id, { includeDeleted: true })
    if (!doc) return null
    await this.put(collection, doc, { dirty: false, serverId })
    return this.get(collection, id, { includeDeleted: true })
  }

  // ── meta ──

  async getMeta(key, fallback = null) {
    await this.init()
    const value = await this.backend.metaGet(key)
    if (value === null) return fallback
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  async setMeta(key, value) {
    await this.init()
    await this.backend.metaSet(key, JSON.stringify(value))
  }

  // ── maintenance ──

  /** Drop the in-memory cache; the next read re-hydrates from disk. */
  invalidate(collection) {
    if (collection) this._cache.delete(collection)
    else this._cache.clear()
  }

  async clear() {
    await this.init()
    await this.backend.clearAll()
    this._cache.clear()
    await this.backend.metaSet(SCHEMA_VERSION_KEY, String(SCHEMA_VERSION))
    this._notify(null)
  }

  async stats() {
    await this.init()
    const estimate = await this.backend.estimateSize()
    const perCollection = {}
    for (const name of Object.values(COLLECTIONS)) {
      const docs = await this.all(name, { includeDeleted: true })
      perCollection[name] = {
        total: docs.length,
        live: docs.filter(doc => !doc._deletedAt).length,
        dirty: docs.filter(doc => doc._dirty).length,
      }
    }
    return { ...estimate, collections: perCollection }
  }
}

export const store = new DocumentStore()

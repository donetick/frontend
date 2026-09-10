/**
 * Storage backends for the document store.
 *
 * Both are deliberately dumb: they move opaque rows in and out and know nothing
 * about chores, dirty flags or tombstones. All of that lives once in
 * `store.js`, which is the whole point of collapsing the old table-per-entity
 * design — there is no second implementation to keep in sync.
 *
 * A row is:
 *   { collection, id, doc (JSON string), serverId, updatedAt, deletedAt, dirty }
 */

import { Capacitor } from '@capacitor/core'
import { CapacitorSQLite } from '@capacitor-community/sqlite'

export const DB_NAME = 'donetick_local'
const SQLITE_VERSION = 1
const IDB_VERSION = 1
const DOCUMENTS = 'documents'
const META = 'meta'

let cachedIsNative = null
export const isNativePlatform = () => {
  if (cachedIsNative === null) {
    try {
      cachedIsNative = Capacitor.isNativePlatform()
    } catch {
      cachedIsNative = false
    }
  }
  return cachedIsNative
}

// The raw CapacitorSQLite query API prepends a metadata row on iOS
// (e.g. { ios_columns: [...] }); the plugin's connection wrapper strips it but
// we call the plugin directly.
const queryRows = result =>
  (result?.values || []).filter(
    row => row && typeof row === 'object' && !('ios_columns' in row),
  )

const fromSqlRow = row => ({
  collection: row.collection,
  id: row.id,
  doc: row.doc,
  serverId: row.server_id ?? null,
  updatedAt: row.updated_at ?? 0,
  deletedAt: row.deleted_at ?? null,
  dirty: row.dirty ? 1 : 0,
})

// ── SQLite backend (iOS / Android) ──

export class SQLiteBackend {
  constructor() {
    this.initialized = false
    this._initPromise = null
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
    try {
      await CapacitorSQLite.createConnection({
        database: DB_NAME,
        version: SQLITE_VERSION,
        encrypted: false,
        mode: 'no-encryption',
      })
    } catch (err) {
      // Connection already open (React StrictMode double-mount) — reuse it.
      if (!err?.message?.includes('already exists')) throw err
    }
    await CapacitorSQLite.open({ database: DB_NAME })

    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: `
        CREATE TABLE IF NOT EXISTS documents (
          collection TEXT NOT NULL,
          id         TEXT NOT NULL,
          doc        TEXT NOT NULL,
          server_id  TEXT,
          updated_at INTEGER NOT NULL DEFAULT 0,
          deleted_at INTEGER,
          dirty      INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (collection, id)
        );

        CREATE INDEX IF NOT EXISTS idx_documents_collection ON documents(collection);
        CREATE INDEX IF NOT EXISTS idx_documents_server_id ON documents(collection, server_id);
        CREATE INDEX IF NOT EXISTS idx_documents_dirty ON documents(dirty);

        CREATE TABLE IF NOT EXISTS meta (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `,
    })

    this.initialized = true
  }

  async readAll(collection) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT * FROM documents WHERE collection = ?;',
      values: [collection],
    })
    return queryRows(result).map(fromSqlRow)
  }

  async readCollections() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT DISTINCT collection FROM documents;',
      values: [],
    })
    return queryRows(result).map(row => row.collection)
  }

  async writeMany(rows) {
    if (!rows.length) return
    await CapacitorSQLite.executeSet({
      database: DB_NAME,
      set: rows.map(row => ({
        statement: `INSERT OR REPLACE INTO documents
          (collection, id, doc, server_id, updated_at, deleted_at, dirty)
          VALUES (?, ?, ?, ?, ?, ?, ?);`,
        values: [
          row.collection,
          row.id,
          row.doc,
          row.serverId ?? null,
          row.updatedAt,
          row.deletedAt ?? null,
          row.dirty,
        ],
      })),
    })
  }

  async deleteMany(collection, ids) {
    if (!ids.length) return
    await CapacitorSQLite.executeSet({
      database: DB_NAME,
      set: ids.map(id => ({
        statement: 'DELETE FROM documents WHERE collection = ? AND id = ?;',
        values: [collection, id],
      })),
    })
  }

  async clearCollection(collection) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'DELETE FROM documents WHERE collection = ?;',
      values: [collection],
    })
  }

  async clearAll() {
    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: 'DELETE FROM documents; DELETE FROM meta;',
    })
  }

  async metaGet(key) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT value FROM meta WHERE key = ?;',
      values: [key],
    })
    const rows = queryRows(result)
    return rows.length ? rows[0].value : null
  }

  async metaSet(key, value) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?);',
      values: [key, value],
    })
  }

  async metaAll() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT key, value FROM meta;',
      values: [],
    })
    return Object.fromEntries(
      queryRows(result).map(row => [row.key, row.value]),
    )
  }

  /** Rough on-disk footprint, for the storage diagnostics screen. */
  async estimateSize() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement:
        'SELECT SUM(LENGTH(doc)) AS bytes, COUNT(*) AS rows FROM documents;',
      values: [],
    })
    const row = queryRows(result)[0] ?? {}
    return { bytes: Number(row.bytes ?? 0), rows: Number(row.rows ?? 0) }
  }
}

// ── IndexedDB backend (web / PWA) ──

export class IndexedDBBackend {
  constructor() {
    this.db = null
    this._initPromise = null
  }

  async init() {
    if (this.db) return
    if (this._initPromise) return this._initPromise
    this._initPromise = this._open().finally(() => {
      this._initPromise = null
    })
    return this._initPromise
  }

  _open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, IDB_VERSION)

      request.onupgradeneeded = event => {
        const db = event.target.result
        if (!db.objectStoreNames.contains(DOCUMENTS)) {
          const documents = db.createObjectStore(DOCUMENTS, {
            keyPath: ['collection', 'id'],
          })
          documents.createIndex('collection', 'collection', { unique: false })
          documents.createIndex('dirty', 'dirty', { unique: false })
        }
        if (!db.objectStoreNames.contains(META)) {
          db.createObjectStore(META, { keyPath: 'key' })
        }
      }

      request.onsuccess = () => {
        this.db = request.result
        // A second tab requesting an upgrade must not be blocked by this one.
        this.db.onversionchange = () => {
          this.db.close()
          this.db = null
        }
        resolve()
      }
      request.onerror = () => reject(request.error)
    })
  }

  async _tx(storeName, mode = 'readonly') {
    await this.init()
    return this.db.transaction(storeName, mode).objectStore(storeName)
  }

  _request(idbRequest) {
    return new Promise((resolve, reject) => {
      idbRequest.onsuccess = () => resolve(idbRequest.result)
      idbRequest.onerror = () => reject(idbRequest.error)
    })
  }

  async readAll(collection) {
    const store = await this._tx(DOCUMENTS)
    const rows = await this._request(
      store.index('collection').getAll(IDBKeyRange.only(collection)),
    )
    return rows ?? []
  }

  async readCollections() {
    const store = await this._tx(DOCUMENTS)
    const rows = await this._request(store.getAll())
    return [...new Set((rows ?? []).map(row => row.collection))]
  }

  async writeMany(rows) {
    if (!rows.length) return
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(DOCUMENTS, 'readwrite')
      const store = tx.objectStore(DOCUMENTS)
      for (const row of rows) store.put(row)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  async deleteMany(collection, ids) {
    if (!ids.length) return
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(DOCUMENTS, 'readwrite')
      const store = tx.objectStore(DOCUMENTS)
      for (const id of ids) store.delete([collection, id])
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
      tx.onabort = () => reject(tx.error)
    })
  }

  async clearCollection(collection) {
    const rows = await this.readAll(collection)
    await this.deleteMany(
      collection,
      rows.map(row => row.id),
    )
  }

  async clearAll() {
    await this.init()
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([DOCUMENTS, META], 'readwrite')
      tx.objectStore(DOCUMENTS).clear()
      tx.objectStore(META).clear()
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async metaGet(key) {
    const store = await this._tx(META)
    const row = await this._request(store.get(key))
    return row ? row.value : null
  }

  async metaSet(key, value) {
    const store = await this._tx(META, 'readwrite')
    await this._request(store.put({ key, value }))
  }

  async metaAll() {
    const store = await this._tx(META)
    const rows = await this._request(store.getAll())
    return Object.fromEntries((rows ?? []).map(row => [row.key, row.value]))
  }

  async estimateSize() {
    const collections = await this.readCollections()
    let bytes = 0
    let rows = 0
    for (const collection of collections) {
      const docs = await this.readAll(collection)
      rows += docs.length
      for (const row of docs) bytes += row.doc?.length ?? 0
    }

    // navigator.storage gives the browser's own accounting, which is what
    // Safari's eviction decisions are actually based on.
    let quota = null
    let usage = null
    if (typeof navigator !== 'undefined' && navigator.storage?.estimate) {
      try {
        const estimate = await navigator.storage.estimate()
        quota = estimate.quota ?? null
        usage = estimate.usage ?? null
      } catch {
        // estimate() is not available everywhere; diagnostics degrade quietly.
      }
    }

    return { bytes, rows, quota, usage }
  }
}

/** Pick the backend for the current platform. */
export const createBackend = () =>
  isNativePlatform() ? new SQLiteBackend() : new IndexedDBBackend()

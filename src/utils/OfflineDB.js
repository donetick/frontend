import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { isOfflineFeatureEnabled } from './OfflineFeatureToggle'

const DB_NAME = 'donetick_offline'
const DB_VERSION = 2
const IDB_NAME = 'donetick_offline'
const IDB_VERSION = 2

// Cache platform detection
let _isNative = null
const isNative = () => {
  if (_isNative === null) {
    try {
      _isNative = Capacitor.isNativePlatform()
    } catch {
      _isNative = false
    }
  }
  return _isNative
}

// ── SQLite backend (iOS/Android) ──

class SQLiteBackend {
  constructor() {
    this.db = null
    this.initialized = false
    this._initPromise = null
  }

  async init() {
    if (this.initialized) return
    // Return the in-flight promise if init is already underway (prevents double createConnection)
    if (this._initPromise) return this._initPromise

    this._initPromise = this._doInit().finally(() => {
      this._initPromise = null
    })
    return this._initPromise
  }

  async _doInit() {
    try {
      this.db = await CapacitorSQLite.createConnection({
        database: DB_NAME,
        version: DB_VERSION,
        encrypted: false,
        mode: 'no-encryption',
      })
    } catch (err) {
      // Connection already open (e.g. React StrictMode double-mount) — reuse it
      if (!err?.message?.includes('already exists')) throw err
    }
    await CapacitorSQLite.open({ database: DB_NAME })

    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: `
        CREATE TABLE IF NOT EXISTS cached_chores (
          id INTEGER PRIMARY KEY,
          data TEXT NOT NULL,
          sync_version INTEGER NOT NULL DEFAULT 0,
          cached_at INTEGER NOT NULL
        );

        CREATE TABLE IF NOT EXISTS command_queue (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          command_type TEXT NOT NULL,
          entity_id TEXT NOT NULL,
          payload TEXT NOT NULL,
          created_at INTEGER NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          error TEXT
        );

        CREATE TABLE IF NOT EXISTS sync_meta (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS cached_history (
          id INTEGER PRIMARY KEY,
          chore_id INTEGER NOT NULL,
          data TEXT NOT NULL,
          performed_at INTEGER NOT NULL,
          pending INTEGER NOT NULL DEFAULT 0,
          cached_at INTEGER NOT NULL
        );

        CREATE INDEX IF NOT EXISTS idx_history_chore_id ON cached_history(chore_id);
        CREATE INDEX IF NOT EXISTS idx_history_performed_at ON cached_history(performed_at DESC);
        CREATE INDEX IF NOT EXISTS idx_history_pending ON cached_history(pending);
      `,
    })

    this.initialized = true
  }

  // ── Chore cache ──

  async saveChores(chores) {
    if (!chores.length) return

    const statements = chores.map(chore => ({
      statement:
        'INSERT OR REPLACE INTO cached_chores (id, data, sync_version, cached_at) VALUES (?, ?, ?, ?)',
      values: [
        chore.id,
        JSON.stringify(chore),
        chore.syncVersion || 0,
        Date.now(),
      ],
    }))

    await CapacitorSQLite.executeSet({
      database: DB_NAME,
      set: statements,
    })
  }

  async getChores(includeArchive = false) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT data FROM cached_chores',
      values: [],
    })
    const chores = (result.values || []).map(row => JSON.parse(row.data))
    if (includeArchive) {
      return chores
    }
    return chores.filter(chore => chore.isActive !== false)
  }

  async getChore(id) {
    const numericId = Number(id)
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT data FROM cached_chores WHERE id = ?',
      values: [isNaN(numericId) ? id : numericId],
    })
    if (result.values && result.values.length > 0) {
      return JSON.parse(result.values[0].data)
    }
    return null
  }

  async deleteChores(ids) {
    if (!ids.length) return
    const statements = ids.map(id => ({
      statement: 'DELETE FROM cached_chores WHERE id = ?',
      values: [id],
    }))
    await CapacitorSQLite.executeSet({
      database: DB_NAME,
      set: statements,
    })
  }

  async clearChores() {
    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: 'DELETE FROM cached_chores',
    })
  }

  // ── History cache ──

  async saveHistory(entries) {
    if (!entries.length) return
    // Delete pending entries for the affected chore IDs first
    const choreIds = [...new Set(entries.map(e => Number(e.choreId)))]
    if (choreIds.length) {
      const placeholders = choreIds.map(() => '?').join(', ')
      await CapacitorSQLite.run({
        database: DB_NAME,
        statement: `DELETE FROM cached_history WHERE pending = 1 AND chore_id IN (${placeholders})`,
        values: choreIds,
      })
    }
    const statements = entries.map(entry => ({
      statement:
        'INSERT OR REPLACE INTO cached_history (id, chore_id, data, performed_at, pending, cached_at) VALUES (?, ?, ?, ?, ?, ?)',
      values: [
        entry.id,
        Number(entry.choreId),
        JSON.stringify(entry),
        new Date(entry.performedAt).getTime(),
        0,
        Date.now(),
      ],
    }))
    await CapacitorSQLite.executeSet({ database: DB_NAME, set: statements })
  }

  async savePendingHistory(entry) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement:
        'INSERT OR REPLACE INTO cached_history (id, chore_id, data, performed_at, pending, cached_at) VALUES (?, ?, ?, ?, ?, ?)',
      values: [
        entry.id,
        Number(entry.choreId),
        JSON.stringify(entry),
        new Date(entry.performedAt).getTime(),
        1,
        Date.now(),
      ],
    })
  }

  async getHistoryByChore(choreId) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement:
        'SELECT data FROM cached_history WHERE chore_id = ? ORDER BY performed_at DESC',
      values: [Number(choreId)],
    })
    return (result.values || []).map(row => JSON.parse(row.data))
  }

  async getHistoryByDays(days) {
    const since = days >= 365 ? 0 : Date.now() - days * 24 * 60 * 60 * 1000
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement:
        since === 0
          ? 'SELECT data FROM cached_history ORDER BY performed_at DESC'
          : 'SELECT data FROM cached_history WHERE performed_at >= ? ORDER BY performed_at DESC',
      values: since === 0 ? [] : [since],
    })
    return (result.values || []).map(row => JSON.parse(row.data))
  }

  async deleteHistory(ids) {
    if (!ids.length) return
    const statements = ids.map(id => ({
      statement: 'DELETE FROM cached_history WHERE id = ?',
      values: [id],
    }))
    await CapacitorSQLite.executeSet({ database: DB_NAME, set: statements })
  }

  async updateHistoryEntry(choreId, historyId, updates) {
    const existing = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT data, pending FROM cached_history WHERE id = ?',
      values: [historyId],
    })

    if (!existing.values?.length) return

    const row = existing.values[0]
    const current = JSON.parse(row.data)
    const merged = {
      ...current,
      ...updates,
      id: historyId,
      choreId: Number(choreId),
    }

    await CapacitorSQLite.run({
      database: DB_NAME,
      statement:
        'INSERT OR REPLACE INTO cached_history (id, chore_id, data, performed_at, pending, cached_at) VALUES (?, ?, ?, ?, ?, ?)',
      values: [
        historyId,
        Number(choreId),
        JSON.stringify(merged),
        new Date(merged.performedAt).getTime(),
        row.pending || 0,
        Date.now(),
      ],
    })
  }

  async deleteHistoryEntry(historyId) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'DELETE FROM cached_history WHERE id = ?',
      values: [historyId],
    })
  }

  async clearHistory() {
    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: 'DELETE FROM cached_history',
    })
  }

  // ── Command queue ──

  async enqueueCommand(command) {
    const result = await CapacitorSQLite.run({
      database: DB_NAME,
      statement: `INSERT INTO command_queue (command_type, entity_id, payload, created_at, status, error)
                  VALUES (?, ?, ?, ?, ?, ?)`,
      values: [
        command.commandType,
        command.entityId,
        command.payload,
        command.createdAt,
        command.status,
        command.error,
      ],
    })
    return result.changes?.lastId
  }

  async getCommands() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT * FROM command_queue ORDER BY created_at ASC',
      values: [],
    })
    return (result.values || []).map(row => ({
      id: row.id,
      commandType: row.command_type,
      entityId: row.entity_id,
      payload: row.payload,
      createdAt: row.created_at,
      status: row.status,
      error: row.error,
    }))
  }

  async getCommandsByEntity(entityId) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement:
        'SELECT * FROM command_queue WHERE entity_id = ? ORDER BY created_at ASC',
      values: [entityId],
    })
    return (result.values || []).map(row => ({
      id: row.id,
      commandType: row.command_type,
      entityId: row.entity_id,
      payload: row.payload,
      createdAt: row.created_at,
      status: row.status,
      error: row.error,
    }))
  }

  async updateCommandStatus(id, status, error) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'UPDATE command_queue SET status = ?, error = ? WHERE id = ?',
      values: [status, error, id],
    })
  }

  async updateCommand(id, updates) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT * FROM command_queue WHERE id = ?',
      values: [id],
    })

    if (!result.values?.length) return

    const row = result.values[0]
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: `UPDATE command_queue
                  SET command_type = ?, entity_id = ?, payload = ?, created_at = ?, status = ?, error = ?
                  WHERE id = ?`,
      values: [
        updates.commandType ?? row.command_type,
        updates.entityId ?? row.entity_id,
        updates.payload ?? row.payload,
        updates.createdAt ?? row.created_at,
        updates.status ?? row.status,
        Object.prototype.hasOwnProperty.call(updates, 'error')
          ? updates.error
          : row.error,
        id,
      ],
    })
  }

  async removeCommand(id) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'DELETE FROM command_queue WHERE id = ?',
      values: [id],
    })
  }

  async clearCommands() {
    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: 'DELETE FROM command_queue',
    })
  }

  // ── Sync metadata ──

  async getSyncCursor() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: "SELECT value FROM sync_meta WHERE key = 'sync_cursor'",
      values: [],
    })
    if (result.values && result.values.length > 0) {
      return Number(result.values[0].value)
    }
    return 0
  }

  async setSyncCursor(cursor) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement:
        "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('sync_cursor', ?)",
      values: [String(cursor)],
    })
  }

  async getLastSyncTime() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: "SELECT value FROM sync_meta WHERE key = 'last_sync_time'",
      values: [],
    })
    if (result.values && result.values.length > 0) {
      return Number(result.values[0].value)
    }
    return null
  }

  async setLastSyncTime(time) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement:
        "INSERT OR REPLACE INTO sync_meta (key, value) VALUES ('last_sync_time', ?)",
      values: [String(time)],
    })
  }

  async saveKV(key, value) {
    await CapacitorSQLite.run({
      database: DB_NAME,
      statement: 'INSERT OR REPLACE INTO sync_meta (key, value) VALUES (?, ?)',
      values: [key, JSON.stringify(value)],
    })
  }

  async getKV(key) {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT value FROM sync_meta WHERE key = ?',
      values: [key],
    })
    if (result.values && result.values.length > 0) {
      try {
        return JSON.parse(result.values[0].value)
      } catch {
        return null
      }
    }
    return null
  }

  async clearAll() {
    await CapacitorSQLite.execute({
      database: DB_NAME,
      statements: `
        DELETE FROM cached_chores;
        DELETE FROM command_queue;
        DELETE FROM sync_meta;
        DELETE FROM cached_history;
      `,
    })
  }
}

// ── IndexedDB backend (Web) ──

class IndexedDBBackend {
  constructor() {
    this.db = null
    this.initialized = false
  }

  _open() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(IDB_NAME, IDB_VERSION)

      request.onupgradeneeded = event => {
        const db = event.target.result

        if (!db.objectStoreNames.contains('cached_chores')) {
          db.createObjectStore('cached_chores', { keyPath: 'id' })
        }

        if (!db.objectStoreNames.contains('command_queue')) {
          const cmdStore = db.createObjectStore('command_queue', {
            keyPath: 'id',
            autoIncrement: true,
          })
          cmdStore.createIndex('entity_id', 'entityId', { unique: false })
          cmdStore.createIndex('created_at', 'createdAt', { unique: false })
          cmdStore.createIndex('status', 'status', { unique: false })
        }

        if (!db.objectStoreNames.contains('sync_meta')) {
          db.createObjectStore('sync_meta', { keyPath: 'key' })
        }

        if (!db.objectStoreNames.contains('cached_history')) {
          const histStore = db.createObjectStore('cached_history', {
            keyPath: 'id',
          })
          histStore.createIndex('chore_id', 'choreId', { unique: false })
          histStore.createIndex('performed_at', 'performedAt', {
            unique: false,
          })
          histStore.createIndex('pending', 'pending', { unique: false })
        }
      }

      request.onsuccess = event => resolve(event.target.result)
      request.onerror = event => reject(event.target.error)
    })
  }

  async init() {
    if (this.initialized) return
    this.db = await this._open()
    // Re-open if browser closes the connection (e.g. after device sleep)
    this.db.onclose = () => {
      this.initialized = false
    }
    this.initialized = true
  }

  async _tx(storeName, mode = 'readonly') {
    // If the connection was closed (e.g. laptop sleep), re-open transparently
    if (!this.initialized || !this.db) {
      await this.init()
    }
    try {
      const tx = this.db.transaction(storeName, mode)
      const store = tx.objectStore(storeName)
      return { tx, store }
    } catch (err) {
      // InvalidStateError = connection closed; re-open once and retry
      if (
        err.name === 'InvalidStateError' ||
        err.name === 'TransactionInactiveError'
      ) {
        this.initialized = false
        await this.init()
        const tx = this.db.transaction(storeName, mode)
        const store = tx.objectStore(storeName)
        return { tx, store }
      }
      throw err
    }
  }

  _request(idbRequest) {
    return new Promise((resolve, reject) => {
      idbRequest.onsuccess = () => resolve(idbRequest.result)
      idbRequest.onerror = () => reject(idbRequest.error)
    })
  }

  // ── Chore cache ──

  async saveChores(chores) {
    if (!chores.length) return

    const { tx, store } = await this._tx('cached_chores', 'readwrite')

    for (const chore of chores) {
      store.put({
        id: chore.id,
        data: chore,
        syncVersion: chore.syncVersion || 0,
        cachedAt: Date.now(),
      })
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getChores(includeArchive = false) {
    const { store } = await this._tx('cached_chores')
    const rows = await this._request(store.getAll())
    const chores = rows.map(row => row.data)
    if (includeArchive) {
      return chores
    }
    return chores.filter(chore => chore.isActive !== false)
  }

  async getChore(id) {
    const { store } = await this._tx('cached_chores')
    // Try numeric ID first (chores are stored with numeric keys from the server)
    // URL params are strings so we need to coerce
    const numericId = Number(id)
    const row = await this._request(
      store.get(isNaN(numericId) ? id : numericId),
    )
    return row ? row.data : null
  }

  async deleteChores(ids) {
    if (!ids.length) return
    const { tx, store } = await this._tx('cached_chores', 'readwrite')
    for (const id of ids) {
      store.delete(id)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async clearChores() {
    const { store } = await this._tx('cached_chores', 'readwrite')
    await this._request(store.clear())
  }

  // ── History cache ──

  async saveHistory(entries) {
    if (!entries.length) return
    // Delete pending entries for the affected chore IDs first
    const choreIds = [...new Set(entries.map(e => Number(e.choreId)))]
    await this._deletePendingHistoryByChoreIds(choreIds)
    // Upsert real entries
    const { tx, store } = await this._tx('cached_history', 'readwrite')
    for (const entry of entries) {
      store.put({
        id: entry.id,
        choreId: Number(entry.choreId),
        data: entry,
        performedAt: new Date(entry.performedAt).getTime(),
        pending: 0,
        cachedAt: Date.now(),
      })
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async savePendingHistory(entry) {
    const { store } = await this._tx('cached_history', 'readwrite')
    await this._request(
      store.put({
        id: entry.id,
        choreId: Number(entry.choreId),
        data: entry,
        performedAt: new Date(entry.performedAt).getTime(),
        pending: 1,
        cachedAt: Date.now(),
      }),
    )
  }

  async _deletePendingHistoryByChoreIds(choreIds) {
    if (!choreIds.length) return
    const choreIdSet = new Set(choreIds)
    // Tx 1: read all pending entries
    const { store: readStore } = await this._tx('cached_history')
    const index = readStore.index('pending')
    const rows = await this._request(index.getAll(1))
    const toDelete = rows
      .filter(row => choreIdSet.has(Number(row.choreId)))
      .map(row => row.id)
    if (!toDelete.length) return
    // Tx 2: delete them
    const { tx, store: writeStore } = await this._tx(
      'cached_history',
      'readwrite',
    )
    for (const id of toDelete) {
      writeStore.delete(id)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async getHistoryByChore(choreId) {
    const { store } = await this._tx('cached_history')
    const index = store.index('chore_id')
    const rows = await this._request(index.getAll(Number(choreId)))
    return rows
      .map(row => row.data)
      .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
  }

  async getHistoryByDays(days) {
    const since = days >= 365 ? 0 : Date.now() - days * 24 * 60 * 60 * 1000
    const { store } = await this._tx('cached_history')
    const rows = await this._request(store.getAll())
    return rows
      .map(row => row.data)
      .filter(entry =>
        since === 0 ? true : new Date(entry.performedAt).getTime() >= since,
      )
      .sort((a, b) => new Date(b.performedAt) - new Date(a.performedAt))
  }

  async deleteHistory(ids) {
    if (!ids.length) return
    const { tx, store } = await this._tx('cached_history', 'readwrite')
    for (const id of ids) {
      store.delete(id)
    }
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
  }

  async updateHistoryEntry(choreId, historyId, updates) {
    const { store } = await this._tx('cached_history')
    const existing = await this._request(store.get(historyId))
    if (!existing) return

    const merged = {
      ...existing,
      choreId: Number(choreId),
      data: {
        ...existing.data,
        ...updates,
        id: historyId,
        choreId: Number(choreId),
      },
    }
    merged.performedAt = new Date(merged.data.performedAt).getTime()
    merged.cachedAt = Date.now()

    const { store: writeStore } = await this._tx('cached_history', 'readwrite')
    await this._request(writeStore.put(merged))
  }

  async deleteHistoryEntry(historyId) {
    const { store } = await this._tx('cached_history', 'readwrite')
    await this._request(store.delete(historyId))
  }

  async clearHistory() {
    const { store } = await this._tx('cached_history', 'readwrite')
    await this._request(store.clear())
  }

  // ── Command queue ──

  async enqueueCommand(command) {
    const { store } = await this._tx('command_queue', 'readwrite')
    const id = await this._request(
      store.add({
        commandType: command.commandType,
        entityId: command.entityId,
        payload: command.payload,
        createdAt: command.createdAt,
        status: command.status,
        error: command.error,
      }),
    )
    return id
  }

  async getCommands() {
    const { store } = await this._tx('command_queue')
    const index = store.index('created_at')
    const rows = await this._request(index.getAll())
    return rows
  }

  async getCommandsByEntity(entityId) {
    const { store } = await this._tx('command_queue')
    const index = store.index('entity_id')
    const rows = await this._request(index.getAll(entityId))
    return rows.sort((a, b) => a.createdAt - b.createdAt)
  }

  async updateCommandStatus(id, status, error) {
    const { store } = await this._tx('command_queue', 'readwrite')
    const row = await this._request(store.get(id))
    if (row) {
      row.status = status
      row.error = error
      await this._request(store.put(row))
    }
  }

  async updateCommand(id, updates) {
    const { store } = await this._tx('command_queue', 'readwrite')
    const row = await this._request(store.get(id))
    if (row) {
      await this._request(
        store.put({
          ...row,
          ...updates,
        }),
      )
    }
  }

  async removeCommand(id) {
    const { store } = await this._tx('command_queue', 'readwrite')
    await this._request(store.delete(id))
  }

  async clearCommands() {
    const { store } = await this._tx('command_queue', 'readwrite')
    await this._request(store.clear())
  }

  // ── Sync metadata ──

  async getSyncCursor() {
    const { store } = await this._tx('sync_meta')
    const row = await this._request(store.get('sync_cursor'))
    return row ? Number(row.value) : 0
  }

  async setSyncCursor(cursor) {
    const { store } = await this._tx('sync_meta', 'readwrite')
    await this._request(
      store.put({ key: 'sync_cursor', value: String(cursor) }),
    )
  }

  async getLastSyncTime() {
    const { store } = await this._tx('sync_meta')
    const row = await this._request(store.get('last_sync_time'))
    return row ? Number(row.value) : null
  }

  async setLastSyncTime(time) {
    const { store } = await this._tx('sync_meta', 'readwrite')
    await this._request(
      store.put({ key: 'last_sync_time', value: String(time) }),
    )
  }

  async saveKV(key, value) {
    const { store } = await this._tx('sync_meta', 'readwrite')
    await this._request(store.put({ key, value: JSON.stringify(value) }))
  }

  async getKV(key) {
    const { store } = await this._tx('sync_meta')
    const row = await this._request(store.get(key))
    if (row) {
      try {
        return JSON.parse(row.value)
      } catch {
        return null
      }
    }
    return null
  }

  async clearAll() {
    const storeNames = [
      'cached_chores',
      'command_queue',
      'sync_meta',
      'cached_history',
    ]
    for (const storeName of storeNames) {
      const { store } = await this._tx(storeName, 'readwrite')
      await this._request(store.clear())
    }
  }
}

// ── OfflineDB facade ──

class OfflineDB {
  constructor() {
    this.backend = null
    this.initialized = false

    // When the tab becomes visible after being hidden (laptop wake/tab switch),
    // reset so the next operation re-validates the IDB connection.
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.backend) {
          // Signal the IDB backend to re-open on next use
          this.backend.initialized = false
        }
      })
    }
  }

  async init() {
    if (this.initialized) return
    if (this._initPromise) return this._initPromise

    this._initPromise = (async () => {
      this.backend = isNative() ? new SQLiteBackend() : new IndexedDBBackend()
      await this.backend.init()
      this.initialized = true
      this._initPromise = null
    })()

    return this._initPromise
  }

  async _ensureInit() {
    if (!this.initialized) {
      await this.init()
    }
  }

  // Chore cache
  async saveChores(chores) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.saveChores(chores)
  }

  async getChores(includeArchive = false) {
    if (!isOfflineFeatureEnabled()) return []
    await this._ensureInit()
    return this.backend.getChores(includeArchive)
  }

  async getChore(id) {
    if (!isOfflineFeatureEnabled()) return null
    await this._ensureInit()
    return this.backend.getChore(id)
  }

  async deleteChores(ids) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.deleteChores(ids)
  }

  async clearChores() {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.clearChores()
  }

  // Command queue
  async enqueueCommand(command) {
    if (!isOfflineFeatureEnabled()) return null
    await this._ensureInit()
    return this.backend.enqueueCommand(command)
  }

  async getCommands() {
    if (!isOfflineFeatureEnabled()) return []
    await this._ensureInit()
    return this.backend.getCommands()
  }

  async getCommandsByEntity(entityId) {
    if (!isOfflineFeatureEnabled()) return []
    await this._ensureInit()
    return this.backend.getCommandsByEntity(entityId)
  }

  async updateCommandStatus(id, status, error) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.updateCommandStatus(id, status, error)
  }

  async updateCommand(id, updates) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.updateCommand(id, updates)
  }

  async removeCommand(id) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.removeCommand(id)
  }

  async clearCommands() {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.clearCommands()
  }

  // Sync metadata
  async getSyncCursor() {
    if (!isOfflineFeatureEnabled()) return 0
    await this._ensureInit()
    return this.backend.getSyncCursor()
  }

  async setSyncCursor(cursor) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.setSyncCursor(cursor)
  }

  async getLastSyncTime() {
    if (!isOfflineFeatureEnabled()) return null
    await this._ensureInit()
    return this.backend.getLastSyncTime()
  }

  async setLastSyncTime(time) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.setLastSyncTime(time)
  }

  // History cache
  async saveHistory(entries) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.saveHistory(entries)
  }

  async savePendingHistory(entry) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.savePendingHistory(entry)
  }

  async getHistoryByChore(choreId) {
    if (!isOfflineFeatureEnabled()) return []
    await this._ensureInit()
    return this.backend.getHistoryByChore(choreId)
  }

  async getHistoryByDays(days) {
    if (!isOfflineFeatureEnabled()) return []
    await this._ensureInit()
    return this.backend.getHistoryByDays(days)
  }

  async deleteHistory(ids) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.deleteHistory(ids)
  }

  async updateHistoryEntry(choreId, historyId, updates) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.updateHistoryEntry(choreId, historyId, updates)
  }

  async deleteHistoryEntry(historyId) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.deleteHistoryEntry(historyId)
  }

  async clearHistory() {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.clearHistory()
  }

  // General key-value cache (uses sync_meta store)
  async saveKV(key, value) {
    if (!isOfflineFeatureEnabled()) return
    await this._ensureInit()
    return this.backend.saveKV(key, value)
  }

  async getKV(key) {
    if (!isOfflineFeatureEnabled()) return null
    await this._ensureInit()
    return this.backend.getKV(key)
  }

  async clearAll() {
    await this._ensureInit()
    return this.backend.clearAll()
  }
}

export const offlineDB = new OfflineDB()

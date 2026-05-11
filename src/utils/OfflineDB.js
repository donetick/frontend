import { CapacitorSQLite } from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import { isOfflineFeatureEnabled } from './OfflineFeatureToggle'

const DB_NAME = 'donetick_offline'
const DB_VERSION = 1
const IDB_NAME = 'donetick_offline'
const IDB_VERSION = 1

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
  }

  async init() {
    if (this.initialized) return

    this.db = await CapacitorSQLite.createConnection({
      database: DB_NAME,
      version: DB_VERSION,
      encrypted: false,
      mode: 'no-encryption',
    })
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

  async getChores() {
    const result = await CapacitorSQLite.query({
      database: DB_NAME,
      statement: 'SELECT data FROM cached_chores',
      values: [],
    })
    return (result.values || [])
      .map(row => JSON.parse(row.data))
      .filter(chore => chore.isActive !== false)
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

  async getChores() {
    const { store } = await this._tx('cached_chores')
    const rows = await this._request(store.getAll())
    return rows.map(row => row.data).filter(chore => chore.isActive !== false)
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
    const storeNames = ['cached_chores', 'command_queue', 'sync_meta']
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

  async getChores() {
    if (!isOfflineFeatureEnabled()) return []
    await this._ensureInit()
    return this.backend.getChores()
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

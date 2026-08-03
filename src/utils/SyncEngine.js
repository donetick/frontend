import { networkManager } from '../hooks/NetworkManager'
import { apiClient } from './ApiClient'
import { commandQueue, CommandType } from './CommandQueue'
import {
  ArchiveChore,
  CreateChore,
  DeleteChore,
  DeleteChoreHistory,
  MarkChoreComplete,
  PauseChore,
  SaveChore,
  SkipChore,
  StartChore,
  UnArchiveChore,
  UpdateChoreHistory,
  UpdateDueDate,
} from './Fetcher'
import { syncOfflineImages } from './ImageCache'
import { offlineDB } from './OfflineDB'
import { isOfflineFeatureEnabled } from './OfflineFeatureToggle'

// Give up on a command after this many transient failures so one stuck
// command can't starve the queue and delta sync forever. Failed commands
// stay visible via commandQueue.getFailed().
const MAX_COMMAND_RETRIES = 8

class SyncEngine {
  constructor() {
    this.isSyncing = false
    this.listeners = []
  }

  // Register listener for sync state changes
  onSyncStateChange(callback) {
    this.listeners.push(callback)
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback)
    }
  }

  _notify(state) {
    this.listeners.forEach(cb => cb(state))
  }

  // Main sync entry point — returns true if sync succeeded, false otherwise
  async sync() {
    if (!isOfflineFeatureEnabled()) return false
    if (this.isSyncing) return false
    this.isSyncing = true
    this._notify({ syncing: true, error: null })

    try {
      await commandQueue.resetSyncing()

      // Step 1: Compact the queue (merge consecutive updates)
      await commandQueue.compact()

      // Step 2: Replay pending commands
      await this._replayCommands()

      // Step 3: Delta sync from server
      await this._deltaSync()

      // Sync succeeded — server is reachable (only sync success restores online status)
      networkManager.setServerReachable()
      this._notify({ syncing: false, lastSync: Date.now() })
      // Reconcile the offline image store against the full cached chore list
      // (prefetch referenced images, evict ones no longer referenced).
      // Fire-and-forget: image downloads must not block or fail the sync.
      offlineDB
        .getChores(true)
        .then(chores => syncOfflineImages(chores || []))
        .catch(() => {})
      return true
    } catch (err) {
      await commandQueue.resetSyncing()
      console.error('Sync failed:', err)
      this._notify({ syncing: false, error: err.message })
      return false
    } finally {
      this.isSyncing = false
    }
  }

  async _replayCommands() {
    const commands = await commandQueue.getPending()

    for (const cmd of commands) {
      if (!networkManager.isOnline) break

      await commandQueue.markSyncing(cmd.id)

      try {
        await this._executeCommand(cmd)
        await commandQueue.markDone(cmd.id)
      } catch (err) {
        const status = err.status || err.statusCode
        const isPermanentRejection =
          status >= 400 &&
          status < 500 &&
          status !== 401 &&
          status !== 408 &&
          status !== 429
        if (status === 409) {
          // Conflict - mark for user attention but continue with other commands
          await commandQueue.markFailed(
            cmd.id,
            'Conflict: modified by another user',
          )
        } else if (status === 404) {
          // Entity no longer exists - discard command
          await commandQueue.markDone(cmd.id)
        } else if (isPermanentRejection) {
          // The server rejected the command outright — retrying can never
          // succeed, so park it as failed instead of blocking the queue.
          await commandQueue.markFailed(
            cmd.id,
            `Rejected by server (${status})`,
          )
        } else if ((cmd.retryCount ?? 0) + 1 >= MAX_COMMAND_RETRIES) {
          await commandQueue.markFailed(
            cmd.id,
            `Gave up after ${MAX_COMMAND_RETRIES} attempts: ${err.message}`,
          )
        } else {
          // Transient network/server error - reset to pending so it retries
          await commandQueue.incrementRetry(cmd.id)
          await commandQueue.resetPending(cmd.id)
          throw err
        }
      }
    }
  }

  async _executeCommand(cmd) {
    let response

    switch (cmd.commandType) {
      case CommandType.CREATE_CHORE:
        response = await CreateChore(cmd.payload)
        // Offline-created chores are queued under a temp id. Once the server
        // assigns the real id, rewrite queued follow-up commands (complete,
        // skip, history edits, …) so they don't replay against the temp id.
        // Never throw past this point: the chore WAS created, and a retry of
        // this command would create a duplicate.
        if (response?.ok && String(cmd.entityId).startsWith('temp_')) {
          try {
            const created = await response.json().catch(() => null)
            const realId = created?.res
            if (realId != null) {
              await commandQueue.remapEntityId(cmd.entityId, realId)
              await offlineDB.deleteChores([cmd.entityId])
            }
          } catch (err) {
            console.error('Failed to remap temp chore id after create', err)
          }
        }
        break

      case CommandType.UPDATE_CHORE:
        response = await SaveChore(cmd.payload)
        break

      case CommandType.COMPLETE_CHORE: {
        const { body, completedDate, id, performer } = cmd.payload
        response = await MarkChoreComplete(
          id,
          body || {},
          completedDate || null,
          performer || null,
        )
        break
      }

      case CommandType.SKIP_CHORE:
        response = await SkipChore(cmd.payload.id || cmd.entityId)
        break

      case CommandType.START_CHORE:
        response = await StartChore(cmd.payload.id || cmd.entityId)
        break

      case CommandType.PAUSE_CHORE:
        response = await PauseChore(cmd.payload.id || cmd.entityId)
        break

      case CommandType.DELETE_CHORE:
        response = await DeleteChore(cmd.payload.id || cmd.entityId)
        break

      case CommandType.UPDATE_CHORE_HISTORY: {
        const { choreId, historyData, historyId } = cmd.payload
        response = await UpdateChoreHistory(choreId, historyId, historyData)
        break
      }

      case CommandType.DELETE_CHORE_HISTORY: {
        const { choreId, historyId } = cmd.payload
        response = await DeleteChoreHistory(choreId, historyId)
        break
      }

      case CommandType.RESCHEDULE_CHORE: {
        const { dueDate, id } = cmd.payload
        response = await UpdateDueDate(id, dueDate)
        break
      }

      case CommandType.ARCHIVE_CHORE:
        response = await ArchiveChore(cmd.payload.id || cmd.entityId)
        break

      case CommandType.UNARCHIVE_CHORE:
        response = await UnArchiveChore(cmd.payload.id || cmd.entityId)
        break

      default:
        console.warn('Unknown command type:', cmd.commandType)
        return
    }

    // Check if the response indicates an error and throw so the caller can handle it
    if (response && typeof response.ok !== 'undefined' && !response.ok) {
      const err = new Error(`API error: ${response.status}`)
      err.status = response.status
      throw err
    }
  }

  async _deltaSync() {
    const cursor = (await offlineDB.getSyncCursor()) || -1

    let hasMore = true
    let currentCursor = cursor

    while (hasMore && networkManager.deviceOnline) {
      // Use apiClient.get which handles auth and returns a fetch Response
      const response = await apiClient.get(
        `/sync/changes?since=${currentCursor}`,
      )

      if (!response || !response.ok) {
        const error = new Error(
          response
            ? `Delta sync failed: ${response.status}`
            : 'Delta sync failed: no response from server',
        )
        error.status = response?.status
        throw error
      }

      const data = await response.json()

      // Upsert changed chores first
      const changedChores = data.changes?.chores ?? []
      if (changedChores.length > 0) {
        await offlineDB.saveChores(changedChores)
      }

      // Upsert changed history entries (also clears any pending entries for the same chore IDs)
      const changedHistory = data.changes?.choreHistories ?? []
      if (changedHistory.length > 0) {
        await offlineDB.saveHistory(changedHistory)
      }

      // Hard-delete removed IDs after inserts (safe if the same ID somehow appears in both)
      const deletedIds = data.deletions?.chores ?? []
      if (deletedIds.length > 0) {
        await offlineDB.deleteChores(deletedIds)
      }

      const deletedHistoryIds = data.deletions?.choreHistories ?? []
      if (deletedHistoryIds.length > 0) {
        await offlineDB.deleteHistory(deletedHistoryIds)
      }

      // Always advance the cursor, even when there are no changes
      if (data.cursor != null) {
        currentCursor = data.cursor
      }

      hasMore = !!data.hasMore
    }

    await offlineDB.setSyncCursor(currentCursor)
    await offlineDB.setLastSyncTime(Date.now())
  }

  // Cache current chores (call after a successful online fetch).
  // Pass complete: true only when `chores` is the *full* list (including
  // archived) — then cached rows missing from it are server-side deletions
  // and get removed, so the offline cache doesn't keep ghost chores.
  async cacheChores(chores, { complete = false } = {}) {
    if (!isOfflineFeatureEnabled()) return
    if (!chores || chores.length === 0) return
    await offlineDB.saveChores(chores)

    if (complete) {
      try {
        const fetchedIds = new Set(chores.map(chore => String(chore.id)))
        const cached = await offlineDB.getChores(true)
        const staleIds = (cached || [])
          .filter(
            chore =>
              chore?.id != null &&
              !String(chore.id).startsWith('temp_') &&
              !fetchedIds.has(String(chore.id)),
          )
          .map(chore => chore.id)
        if (staleIds.length > 0) {
          await offlineDB.deleteChores(staleIds)
        }
      } catch (err) {
        console.error('Failed to reconcile cached chores', err)
      }
    }
    // Fire-and-forget: keep the offline image store in step with the data.
    // Reconcile against the *full* cached list — the passed list may exclude
    // archived chores, and eviction must only run against everything we have.
    offlineDB
      .getChores(true)
      .then(all => syncOfflineImages(all || []))
      .catch(() => {})
  }
}

export const syncEngine = new SyncEngine()

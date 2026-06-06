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
import { offlineDB } from './OfflineDB'
import { isOfflineFeatureEnabled } from './OfflineFeatureToggle'

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
        if (status === 409) {
          // Conflict - mark for user attention but continue with other commands
          await commandQueue.markFailed(
            cmd.id,
            'Conflict: modified by another user',
          )
        } else if (status === 404) {
          // Entity no longer exists - discard command
          await commandQueue.markDone(cmd.id)
        } else {
          // Transient network/server error - reset to pending so it retries
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
        break

      case CommandType.UPDATE_CHORE:
        response = await SaveChore(cmd.payload)
        break

      case CommandType.COMPLETE_CHORE: {
        const { id, body, completedDate, performer } = cmd.payload
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
        const { choreId, historyId, historyData } = cmd.payload
        response = await UpdateChoreHistory(choreId, historyId, historyData)
        break
      }

      case CommandType.DELETE_CHORE_HISTORY: {
        const { choreId, historyId } = cmd.payload
        response = await DeleteChoreHistory(choreId, historyId)
        break
      }

      case CommandType.RESCHEDULE_CHORE: {
        const { id, dueDate } = cmd.payload
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
      if (data.cursor) {
        currentCursor = data.cursor
      }

      hasMore = !!data.hasMore
    }

    await offlineDB.setSyncCursor(currentCursor)
    await offlineDB.setLastSyncTime(Date.now())
  }

  // Cache current chores (call after a successful online fetch)
  async cacheChores(chores) {
    if (!isOfflineFeatureEnabled()) return
    if (!chores || chores.length === 0) return
    await offlineDB.saveChores(chores)
  }
}

export const syncEngine = new SyncEngine()

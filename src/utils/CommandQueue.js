import { offlineDB } from './OfflineDB'
import { isOfflineFeatureEnabled } from './OfflineFeatureToggle'

// Domain command types
export const CommandType = {
  CREATE_CHORE: 'create_chore',
  UPDATE_CHORE: 'update_chore',
  UPDATE_CHORE_HISTORY: 'update_chore_history',
  COMPLETE_CHORE: 'complete_chore',
  SKIP_CHORE: 'skip_chore',
  START_CHORE: 'start_chore',
  PAUSE_CHORE: 'pause_chore',
  DELETE_CHORE: 'delete_chore',
  DELETE_CHORE_HISTORY: 'delete_chore_history',
  RESCHEDULE_CHORE: 'reschedule_chore',
  ARCHIVE_CHORE: 'archive_chore',
  UNARCHIVE_CHORE: 'unarchive_chore',
}

class CommandQueue {
  // Enqueue a domain command
  async enqueue(type, entityId, payload) {
    if (!isOfflineFeatureEnabled()) {
      throw new Error('Offline support is disabled on this device')
    }

    const command = {
      commandType: type,
      entityId: String(entityId),
      payload: JSON.stringify(payload),
      createdAt: Date.now(),
      status: 'pending',
      error: null,
    }
    return offlineDB.enqueueCommand(command)
  }

  // Get all pending commands in order
  async getPending() {
    if (!isOfflineFeatureEnabled()) return []
    const commands = await offlineDB.getCommands()
    return commands
      .filter(c => c.status === 'pending' || c.status === 'syncing')
      .map(c => ({ ...c, payload: JSON.parse(c.payload) }))
  }

  // Get all failed commands
  async getFailed() {
    if (!isOfflineFeatureEnabled()) return []
    const commands = await offlineDB.getCommands()
    return commands
      .filter(c => c.status === 'failed')
      .map(c => ({ ...c, payload: JSON.parse(c.payload) }))
  }

  // Get pending commands for a specific entity (for undo/UI)
  async getPendingForEntity(entityId) {
    if (!isOfflineFeatureEnabled()) return []
    const allCommands = await offlineDB.getCommands()
    const key = String(entityId)
    const commands = allCommands
      .filter(
        c =>
          c.entityId === key ||
          (typeof c.entityId === 'string' && c.entityId.startsWith(`${key}:`)),
      )
      .sort((a, b) => a.createdAt - b.createdAt)
    return commands
      .filter(c => c.status === 'pending' || c.status === 'syncing')
      .map(c => ({ ...c, payload: JSON.parse(c.payload) }))
  }

  // Cancel/undo a pending command
  async cancel(commandId) {
    if (!isOfflineFeatureEnabled()) return
    return offlineDB.removeCommand(commandId)
  }

  // Mark as syncing
  async markSyncing(commandId) {
    if (!isOfflineFeatureEnabled()) return
    return offlineDB.updateCommandStatus(commandId, 'syncing', null)
  }

  // Mark as failed (only for unrecoverable errors like conflicts)
  async markFailed(commandId, error) {
    if (!isOfflineFeatureEnabled()) return
    return offlineDB.updateCommandStatus(commandId, 'failed', error)
  }

  // Reset back to pending (for transient network/server errors so it retries)
  async resetPending(commandId) {
    if (!isOfflineFeatureEnabled()) return
    return offlineDB.updateCommandStatus(commandId, 'pending', null)
  }

  // Reset any in-flight commands so they remain retryable after aborted syncs
  async resetSyncing() {
    if (!isOfflineFeatureEnabled()) return
    const commands = await offlineDB.getCommands()
    const syncingCommands = commands.filter(c => c.status === 'syncing')

    await Promise.all(
      syncingCommands.map(cmd =>
        offlineDB.updateCommandStatus(cmd.id, 'pending', null),
      ),
    )
  }

  // Remove after successful sync
  async markDone(commandId) {
    if (!isOfflineFeatureEnabled()) return
    return offlineDB.removeCommand(commandId)
  }

  // Compact: merge consecutive updates to same entity
  async compact() {
    if (!isOfflineFeatureEnabled()) return
    const pending = await this.getPending()
    const seen = new Map() // entityId -> last command
    const toRemove = []

    for (const cmd of pending) {
      if (cmd.commandType === CommandType.UPDATE_CHORE) {
        const prev = seen.get(cmd.entityId)
        if (prev && prev.commandType === CommandType.UPDATE_CHORE) {
          // Merge: keep latest payload, remove older
          toRemove.push(prev.id)
        }
      }
      seen.set(cmd.entityId, cmd)
    }

    for (const id of toRemove) {
      await offlineDB.removeCommand(id)
    }
  }
}

export const commandQueue = new CommandQueue()

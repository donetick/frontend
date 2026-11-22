import { reorderedChoresAfter } from './BoardOrdering'
import { commandQueue, CommandType } from './CommandQueue'

// Keep the server/cache snapshot untouched: cancellation must reveal its
// original status again. The last queued timer command wins, in queue order.
export const applyPendingChoreCommands = (chore, commands = []) => {
  if (!chore) return chore
  let status = chore.status
  for (const command of commands) {
    if (String(command.entityId) !== String(chore.id)) continue
    if (command.commandType === CommandType.START_CHORE) status = 1
    if (command.commandType === CommandType.PAUSE_CHORE) status = 2
  }
  return status === chore.status ? chore : { ...chore, status }
}

// Chores created while offline only exist in the command queue until they are
// replayed, so every read path has to fold them back into the list it returns
// (minus any that were deleted again before replaying).
export const mergePendingCreates = async chores => {
  const pending = await commandQueue.getPending()
  const pendingCreates = pending.filter(
    cmd => cmd.commandType === CommandType.CREATE_CHORE,
  )
  const deletedIds = new Set(
    pending
      .filter(cmd => cmd.commandType === CommandType.DELETE_CHORE)
      .map(cmd => String(cmd.entityId)),
  )

  const existingIds = new Set((chores || []).map(chore => String(chore.id)))
  const createdFromQueue = pendingCreates
    .filter(
      cmd =>
        !existingIds.has(String(cmd.entityId)) &&
        !deletedIds.has(String(cmd.entityId)),
    )
    .map(cmd => {
      const payload = cmd.payload || {}
      return {
        ...payload,
        id: cmd.entityId,
        nextDueDate: payload.nextDueDate || payload.dueDate || null,
        _pendingCreate: true,
      }
    })

  // Network/delta reads can arrive before replay finishes. Keep queued board
  // moves visible instead of allowing those reads to snap cards back.
  return pending.reduce(
    (current, command) => {
      if (command.commandType !== CommandType.MOVE_PROJECT_CHORE) return current
      const { afterChoreId, choreId, sectionId } = command.payload
      return reorderedChoresAfter(current, choreId, sectionId, afterChoreId)
    },
    [...(chores || []), ...createdFromQueue],
  )
}

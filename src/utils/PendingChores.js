import { reorderedChoresAfter } from './BoardOrdering'
import { commandQueue, CommandType } from './CommandQueue'

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

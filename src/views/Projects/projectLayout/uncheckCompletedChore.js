import { UndoChoreAction } from '../../../utils/Fetcher'

// Tasks reach the completed/archived column two ways: completing them (a task
// with no next occurrence goes inactive) or archiving them by hand. Unchecking
// one should put it back on the board as an open task, so undo the completion
// that archived it before making it active again. Tasks that were never
// completed have nothing to undo and are only unarchived.
export const uncheckCompletedChore = async (chore, unarchive) => {
  if (chore.lastCompletedDate) {
    try {
      await UndoChoreAction(chore.id)
    } catch (error) {
      // The undo endpoint uses 400 for several failures. Only its explicit
      // no-recent-action response means there is nothing available to undo.
      const noRecentAction =
        error?.status === 400 &&
        error?.message ===
          'No recent action found to undo (actions can only be undone within 5 minutes)'
      if (!noRecentAction) throw error
    }
  }
  return unarchive(chore.id)
}

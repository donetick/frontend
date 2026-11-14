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
    } catch {
      /* Nothing to undo. Unarchiving alone still restores the task. */
    }
  }
  return unarchive(chore.id)
}

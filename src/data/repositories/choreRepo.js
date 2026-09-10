/**
 * Chore repository — the local-mode equivalent of the server's chore handler.
 *
 * Everything here reads and writes the document store only; there is no network
 * call in this file. Documents are shaped like the API's chore JSON (`labelsV2`,
 * `nextDueDate`, `frequencyMetadata`, …) so views and filters keep working
 * unchanged, with one difference: `id` is the permanent local UUID.
 */

import { completeChore, skipChore, undoChore } from '../../domain/completion'
import { CHORE_STATUS, HISTORY_STATUS } from '../../domain/completion'
import { scheduleNextDueDate } from '../../domain/scheduler'
import { COLLECTIONS, newLocalId, store } from '../store'
import { historyRepo } from './historyRepo'

const nowISO = () => new Date().toISOString()

/**
 * Fields every local chore carries, so views never have to guard against a
 * missing property that the server would always have sent.
 */
const CHORE_DEFAULTS = {
  name: '',
  description: null,
  frequencyType: 'once',
  frequency: 1,
  frequencyMetadata: null,
  nextDueDate: null,
  isRolling: false,
  isActive: true,
  status: CHORE_STATUS.NO_STATUS,
  priority: 0,
  labelsV2: [],
  projectId: null,
  subTasks: null,
  points: null,
  completionWindow: null,
  notification: false,
  notificationMetadata: null,
  requireApproval: false,
  isPrivate: false,
  // Account-shaped fields, present but inert in local mode.
  assignedTo: null,
  assignees: [],
  createdBy: 0,
  circleId: 0,
}

/** Present a stored document the way the API would return it. */
const present = doc => (doc ? { ...doc, id: doc._id } : null)

export const choreRepo = {
  async all({ includeArchived = false } = {}) {
    const docs = await store.all(COLLECTIONS.CHORE)
    return docs
      .filter(doc => includeArchived || doc.isActive !== false)
      .map(present)
  },

  async archived() {
    const docs = await store.all(COLLECTIONS.CHORE)
    return docs.filter(doc => doc.isActive === false).map(present)
  },

  async get(id) {
    return present(await store.get(COLLECTIONS.CHORE, String(id)))
  },

  /**
   * Create or update. A chore without an id is new; the caller gets back the
   * document including its permanent local id.
   */
  async save(chore) {
    const id = chore.id ? String(chore.id) : newLocalId()
    const existing = await store.get(COLLECTIONS.CHORE, id)

    const doc = {
      ...CHORE_DEFAULTS,
      ...existing,
      ...chore,
      id,
      _id: id,
      createdAt: existing?.createdAt ?? nowISO(),
      updatedAt: nowISO(),
    }

    // A brand-new recurring chore with no due date starts from now, matching
    // what the server does when the client leaves nextDueDate empty.
    if (!doc.nextDueDate && doc.dueDate) doc.nextDueDate = doc.dueDate
    delete doc.dueDate

    return present(await store.put(COLLECTIONS.CHORE, doc))
  },

  async remove(id) {
    const key = String(id)
    await historyRepo.removeForChore(key)
    await store.remove(COLLECTIONS.CHORE, key)
    return { id: key }
  },

  async archive(id) {
    const chore = await store.get(COLLECTIONS.CHORE, String(id))
    if (!chore) return null
    return present(
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        isActive: false,
        updatedAt: nowISO(),
      }),
    )
  },

  async unarchive(id) {
    const chore = await store.get(COLLECTIONS.CHORE, String(id))
    if (!chore) return null
    return present(
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        isActive: true,
        updatedAt: nowISO(),
      }),
    )
  },

  /**
   * Complete a chore: advance the due date via the ported scheduler, write a
   * history entry, and reset subtask completion for recurring chores.
   */
  async complete(id, { completedDate, note = null } = {}) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null

    const history = await historyRepo.forChore(key)
    const result = completeChore({
      chore: present(chore),
      completedDate,
      history,
      note,
    })

    const saved = await store.put(COLLECTIONS.CHORE, {
      ...chore,
      ...result.chore,
      _id: key,
      id: key,
    })
    await historyRepo.record(key, result.historyEntry)
    if (result.resetSubtasks) await this.resetSubtasks(key)

    return present(saved)
  },

  /** Skip a chore: advance the due date and record a skipped history entry. */
  async skip(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null

    const result = skipChore({ chore: present(chore) })
    const saved = await store.put(COLLECTIONS.CHORE, {
      ...chore,
      ...result.chore,
      _id: key,
      id: key,
    })
    await historyRepo.record(key, result.historyEntry)

    return present(saved)
  },

  /** Undo the most recent completion/skip, if any. */
  async undo(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null

    const history = await historyRepo.forChore(key)
    const result = undoChore({ chore: present(chore), history })
    if (!result) return present(chore)

    const saved = await store.put(COLLECTIONS.CHORE, {
      ...chore,
      ...result.chore,
      _id: key,
      id: key,
    })
    await historyRepo.remove(result.removedHistoryId)

    return present(saved)
  },

  /** Move the due date without recording a completion. */
  async reschedule(id, nextDueDate) {
    const chore = await store.get(COLLECTIONS.CHORE, String(id))
    if (!chore) return null
    return present(
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        nextDueDate: nextDueDate ? new Date(nextDueDate).toISOString() : null,
        status: CHORE_STATUS.NO_STATUS,
        updatedAt: nowISO(),
      }),
    )
  },

  /** Where the chore would land if completed now — used for previews. */
  async previewNextDueDate(id, completedDate = new Date()) {
    const chore = await store.get(COLLECTIONS.CHORE, String(id))
    if (!chore) return null
    try {
      return scheduleNextDueDate(present(chore), completedDate)
    } catch {
      return null
    }
  },

  async setStatus(id, status) {
    const chore = await store.get(COLLECTIONS.CHORE, String(id))
    if (!chore) return null
    return present(
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        status,
        updatedAt: nowISO(),
      }),
    )
  },

  async start(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null
    // The open "started" entry is what carries the elapsed time until the
    // chore is completed, mirroring the server's time sessions.
    const existing = await historyRepo.startedEntry(key)
    if (!existing) {
      await historyRepo.record(key, {
        choreId: key,
        status: HISTORY_STATUS.STARTED,
        performedAt: null,
        dueDate: chore.nextDueDate ?? null,
        createdAt: nowISO(),
      })
    }
    return this.setStatus(key, CHORE_STATUS.IN_PROGRESS)
  },

  async pause(id) {
    return this.setStatus(id, CHORE_STATUS.PAUSED)
  },

  /** Clear subtask completion after a recurring chore is completed. */
  async resetSubtasks(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore?.subTasks?.length) return null
    return present(
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        subTasks: chore.subTasks.map(subTask => ({
          ...subTask,
          completedAt: null,
          completedBy: null,
        })),
        updatedAt: nowISO(),
      }),
    )
  },

  /** Toggle a single subtask's completion. */
  async setSubtaskCompletion(id, subTaskId, completed) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore?.subTasks?.length) return null
    return present(
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        subTasks: chore.subTasks.map(subTask =>
          String(subTask.id) === String(subTaskId)
            ? { ...subTask, completedAt: completed ? nowISO() : null }
            : subTask,
        ),
        updatedAt: nowISO(),
      }),
    )
  },

  async byLabel(labelId) {
    const docs = await store.all(COLLECTIONS.CHORE)
    return docs
      .filter(doc =>
        (doc.labelsV2 || []).some(
          label => String(label.id) === String(labelId),
        ),
      )
      .map(present)
  },

  async byProject(projectId) {
    const docs = await store.all(COLLECTIONS.CHORE)
    return docs
      .filter(doc => String(doc.projectId) === String(projectId))
      .map(present)
  },
}

export default choreRepo

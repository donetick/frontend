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

/** Sum of every closed session's duration, in seconds. */
const sumClosedDuration = pauseLog =>
  pauseLog.reduce((total, session) => total + (session.duration || 0), 0)

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

    // Completing while the timer is still running (no explicit pause first)
    // must still count the open session, the same way `pause()` closes it.
    const completed = completedDate ? new Date(completedDate) : new Date()
    const pauseLog = chore.timerPauseLog ?? []
    const openIndex = pauseLog.findIndex(session => !session.end)
    const closedLog =
      openIndex === -1
        ? pauseLog
        : pauseLog.map((session, index) => {
            if (index !== openIndex) return session
            const endedAt = completed.toISOString()
            const duration = Math.max(
              0,
              Math.floor((completed - new Date(session.start)) / 1000),
            )
            return { ...session, end: endedAt, duration }
          })
    const totalDuration = sumClosedDuration(closedLog)

    const history = await historyRepo.forChore(key)
    const result = completeChore({
      chore: present(chore),
      completedDate: completed,
      duration: totalDuration,
      history,
      note,
    })

    // The elapsed time is now safely on the history entry (`duration` above);
    // clear the chore's own timer fields so the next occurrence — or a fresh
    // start on a one-shot chore reopened via undo — doesn't inherit sessions
    // or a running total from the cycle that just closed.
    const saved = await store.put(COLLECTIONS.CHORE, {
      ...chore,
      ...result.chore,
      timerStartTime: null,
      timerEndTime: null,
      timerPauseLog: [],
      startTime: null,
      duration: 0,
      timerUpdatedAt: null,
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

    // The timer page (`/chore/:id/timer`) reads a work-session log separate
    // from the history entry above; a new session opens only if the last one
    // was already closed, so repeated starts while running are a no-op.
    const pauseLog = chore.timerPauseLog ?? []
    const hasOpenSession = pauseLog.some(session => !session.end)
    if (!hasOpenSession) {
      const startedAt = nowISO()
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        timerStartTime: chore.timerStartTime ?? startedAt,
        timerPauseLog: [
          ...pauseLog,
          { start: startedAt, end: null, duration: 0, updatedBy: 0 },
        ],
        // `TimePassedCard` reads these top-level fields (mirroring the
        // server's chore JSON) to render the live-counting timer, separate
        // from the `timer*` fields the `/timer` page's session log uses.
        startTime: chore.startTime ?? startedAt,
        duration: sumClosedDuration(pauseLog),
        timerUpdatedAt: startedAt,
        updatedAt: nowISO(),
      })
    }

    return this.setStatus(key, CHORE_STATUS.IN_PROGRESS)
  },

  async pause(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null

    const pauseLog = chore.timerPauseLog ?? []
    const openIndex = pauseLog.findIndex(session => !session.end)
    if (openIndex !== -1) {
      const endedAt = nowISO()
      const open = pauseLog[openIndex]
      const duration = Math.max(
        0,
        Math.floor((new Date(endedAt) - new Date(open.start)) / 1000),
      )
      const closedLog = pauseLog.map((session, index) =>
        index === openIndex ? { ...session, end: endedAt, duration } : session,
      )
      await store.put(COLLECTIONS.CHORE, {
        ...chore,
        timerPauseLog: closedLog,
        duration: sumClosedDuration(closedLog),
        timerUpdatedAt: endedAt,
        updatedAt: nowISO(),
      })
    }

    return this.setStatus(key, CHORE_STATUS.PAUSED)
  },

  /** The timer page's view of a chore: overall span plus each work session. */
  async getTimer(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null
    const pauseLog = chore.timerPauseLog ?? []
    if (!chore.timerStartTime && pauseLog.length === 0) return null
    return {
      id: key,
      startTime: chore.timerStartTime ?? null,
      endTime: chore.timerEndTime ?? null,
      duration: sumClosedDuration(pauseLog),
      pauseLog,
    }
  },

  /** Overwrite the whole timer span/session log, as the timer page's editor does. */
  async updateTimer(id, sessionData = {}) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null
    const pauseLog = sessionData.pauseLog ?? chore.timerPauseLog ?? []
    const openSession = pauseLog.find(session => !session.end)
    await store.put(COLLECTIONS.CHORE, {
      ...chore,
      timerStartTime: sessionData.startTime ?? chore.timerStartTime ?? null,
      timerEndTime: sessionData.endTime ?? null,
      timerPauseLog: pauseLog,
      startTime: sessionData.startTime ?? chore.startTime ?? null,
      duration: sumClosedDuration(pauseLog),
      timerUpdatedAt: openSession
        ? openSession.start
        : (pauseLog[pauseLog.length - 1]?.end ?? chore.timerUpdatedAt ?? null),
      updatedAt: nowISO(),
    })
    return this.getTimer(key)
  },

  /** Drop one work session from the log by its index in `pauseLog`. */
  async deleteTimerSession(id, sessionIndex) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null
    const pauseLog = (chore.timerPauseLog ?? []).filter(
      (_, index) => index !== Number(sessionIndex),
    )
    await store.put(COLLECTIONS.CHORE, {
      ...chore,
      timerPauseLog: pauseLog,
      duration: sumClosedDuration(pauseLog),
      updatedAt: nowISO(),
    })
    return this.getTimer(key)
  },

  /** Clear the session log and go back to a fresh, un-started timer. */
  async resetTimer(id) {
    const key = String(id)
    const chore = await store.get(COLLECTIONS.CHORE, key)
    if (!chore) return null
    await store.put(COLLECTIONS.CHORE, {
      ...chore,
      timerStartTime: null,
      timerEndTime: null,
      timerPauseLog: [],
      startTime: null,
      duration: 0,
      timerUpdatedAt: null,
      updatedAt: nowISO(),
    })
    return this.setStatus(key, CHORE_STATUS.NO_STATUS)
  },

  /** Same as reset — there's no server-side distinction worth keeping locally. */
  async clearTimer(id) {
    return this.resetTimer(id)
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

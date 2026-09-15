/**
 * Local port of the server's chore completion semantics.
 *
 * Mirrors `Handler.completeChore` / `Handler.SkipChore` in
 * `internal/chore/handler.go` together with `ChoreRepository.CompleteChore`,
 * `ChoreRepository.SkipChore` and `ChoreRepository.SetChorePendingApproval` in
 * `internal/chore/repo/repository.go`.
 *
 * These functions are pure: they take the current chore (plus whatever history
 * is known locally) and return the chore as it should look afterwards along
 * with the history entry to persist. Storage and queueing live elsewhere, which
 * is what lets the same logic serve the current offline cache and, later, the
 * local-first repositories.
 */

import { nextDueDateForCompletion, scheduleNextDueDate } from './scheduler'
import { toDate } from './time'

export const CHORE_STATUS = {
  NO_STATUS: 0,
  IN_PROGRESS: 1,
  PAUSED: 2,
  PENDING_APPROVAL: 3,
}

export const HISTORY_STATUS = {
  STARTED: 0,
  COMPLETED: 1,
  SKIPPED: 2,
  PENDING_APPROVAL: 3,
  REJECTED: 4,
  MISSED: 5,
  RESCHEDULED: 6,
}

const toISO = date => (date ? new Date(date).toISOString() : null)

/** The open "started" history entry for a chore, if the timer was running. */
const findStartedEntry = (history = []) =>
  history.find(entry => entry?.status === HISTORY_STATUS.STARTED) ?? null

/**
 * History entries are sorted newest-first by the API. The adaptive scheduler
 * depends on that ordering, so normalise defensively rather than trusting the
 * caller.
 */
const sortedNewestFirst = (history = []) =>
  [...history]
    .filter(entry => entry && entry.status !== HISTORY_STATUS.STARTED)
    .sort(
      (a, b) =>
        (toDate(b.performedAt)?.getTime() ?? 0) -
        (toDate(a.performedAt)?.getTime() ?? 0),
    )

/**
 * Build the history row for a completion/skip, reusing an in-progress "started"
 * entry when one exists — this is how the server preserves the timer duration.
 */
const buildHistoryEntry = ({
  chore,
  duration,
  existingStarted,
  note,
  performedAt,
  performedBy,
  points,
  status,
}) => {
  if (existingStarted) {
    return {
      ...existingStarted,
      performedAt: toISO(performedAt),
      notes: note ?? null,
      status,
      ...(points === null ? {} : { points }),
      ...(duration === null || duration === undefined ? {} : { duration }),
    }
  }

  return {
    // Negative ids mark rows that only exist locally; the server assigns the
    // real one when the command is replayed.
    id: -Date.now(),
    choreId: chore.id,
    performedAt: toISO(performedAt),
    completedBy: performedBy,
    assignedTo: chore.assignedTo ?? null,
    dueDate: toISO(chore.nextDueDate),
    notes: note ?? null,
    status,
    points: points ?? 0,
    ...(duration === null || duration === undefined ? {} : { duration }),
  }
}

/**
 * Apply a completion locally.
 *
 * @param {object} args
 * @param {object} args.chore the chore being completed
 * @param {Date|string} [args.completedDate] defaults to now
 * @param {Array} [args.history] known history, newest first
 * @param {string|null} [args.note]
 * @param {number} [args.completedBy] user id, 0 when unknown/local-only
 * @returns {{chore: object, historyEntry: object, resetSubtasks: boolean}}
 */
export const completeChore = ({
  chore,
  completedBy = 0,
  completedDate,
  duration,
  history = [],
  note = null,
}) => {
  const completed = toDate(completedDate) ?? new Date()
  const existingStarted = findStartedEntry(history)
  const points = chore.points > 0 ? chore.points : null

  // Approval short-circuits: the chore parks in pending-approval and the due
  // date is untouched until an admin acts on it.
  if (chore.requireApproval) {
    return {
      chore: {
        ...chore,
        status: CHORE_STATUS.PENDING_APPROVAL,
        updatedAt: toISO(completed),
      },
      historyEntry: buildHistoryEntry({
        chore,
        duration,
        existingStarted,
        performedAt: completed,
        note,
        performedBy: completedBy,
        status: HISTORY_STATUS.PENDING_APPROVAL,
        points: null,
      }),
      resetSubtasks: false,
    }
  }

  const nextDueDate = nextDueDateForCompletion(
    chore,
    completed,
    sortedNewestFirst(history),
  )

  const updatedChore = {
    ...chore,
    nextDueDate: toISO(nextDueDate),
    status: CHORE_STATUS.NO_STATUS,
    updatedAt: toISO(completed),
  }

  // No next occurrence means the chore is done for good — one-shot tasks and
  // trigger-driven tasks both get archived.
  if (!nextDueDate) updatedChore.isActive = false

  return {
    chore: updatedChore,
    historyEntry: buildHistoryEntry({
      chore,
      duration,
      existingStarted,
      performedAt: completed,
      note,
      performedBy: completedBy,
      status: HISTORY_STATUS.COMPLETED,
      points,
    }),
    // The server resets subtask completion for anything that recurs.
    resetSubtasks:
      Boolean(chore.subTasks?.length) && chore.frequencyType !== 'once',
  }
}

/**
 * Apply a skip locally.
 *
 * The server schedules from the chore's due date (falling back to now), not
 * from the moment the user tapped skip, so a skipped weekly chore lands exactly
 * one week after it was due.
 *
 * @param {object} args
 * @param {object} args.chore
 * @param {Array} [args.history] known history, newest first — used to find and
 *   close an in-progress "started"/timer entry, the same way `completeChore`
 *   does, so a skip doesn't leave a stale open timer session behind
 * @param {Date|string} [args.skippedAt] when the skip happened; defaults to now
 * @param {number} [args.skippedBy]
 * @returns {{chore: object, historyEntry: object}}
 */
export const skipChore = ({
  chore,
  history = [],
  skippedAt,
  skippedBy = 0,
}) => {
  const effectiveSkippedAt = toDate(skippedAt) ?? new Date()
  const scheduleFrom = toDate(chore.nextDueDate) ?? new Date()
  const existingStarted = findStartedEntry(history)

  const nextDueDate = scheduleNextDueDate(chore, scheduleFrom)

  const updatedChore = {
    ...chore,
    nextDueDate: toISO(nextDueDate),
    status: CHORE_STATUS.NO_STATUS,
    updatedAt: toISO(effectiveSkippedAt),
  }
  if (!nextDueDate) updatedChore.isActive = false

  return {
    chore: updatedChore,
    historyEntry: buildHistoryEntry({
      chore,
      existingStarted,
      performedAt: effectiveSkippedAt,
      note: null,
      performedBy: skippedBy,
      status: HISTORY_STATUS.SKIPPED,
      points: null,
    }),
  }
}

const UNDOABLE_STATUSES = [
  HISTORY_STATUS.COMPLETED,
  HISTORY_STATUS.SKIPPED,
  HISTORY_STATUS.PENDING_APPROVAL,
]

/**
 * Undo the most recent completion/skip.
 *
 * Local-mode counterpart of the server's "undo" action. History rows store the
 * due date the chore *had* before the action (see `buildHistoryEntry`), which
 * is exactly what's needed to put `nextDueDate` back. Reactivates a chore that
 * completion deactivated (one-shot/trigger).
 *
 * Known gap: if the undone entry was a reused "started" timer row (see
 * `findStartedEntry`), the elapsed timer session is not restored — the row is
 * removed outright rather than reverted to STARTED. Acceptable for a local,
 * single-user undo; revisit if timer-undo turns out to matter in practice.
 *
 * @param {object} args
 * @param {object} args.chore
 * @param {Array} [args.history] known history, newest first
 * @returns {{chore: object, removedHistoryId: (string|number)}|null} null when
 *   there is nothing undoable
 */
export const undoChore = ({ chore, history = [] }) => {
  const [last] = sortedNewestFirst(history)
  if (!last || !UNDOABLE_STATUSES.includes(last.status)) return null

  return {
    chore: {
      ...chore,
      nextDueDate: last.dueDate ?? chore.nextDueDate,
      status: CHORE_STATUS.NO_STATUS,
      isActive: true,
      updatedAt: new Date().toISOString(),
    },
    removedHistoryId: last.id,
  }
}

/**
 * Best-effort local completion for callers that only need the updated chore and
 * must not throw — an unschedulable chore (bad metadata, unknown frequency)
 * falls back to leaving the due date alone rather than blocking the user.
 */
export const tryCompleteChore = args => {
  try {
    return completeChore(args)
  } catch (error) {
    console.warn('Local completion could not schedule the next due date', error)
    return null
  }
}

/** Same guarantee as `tryCompleteChore`, for skips. */
export const trySkipChore = args => {
  try {
    return skipChore(args)
  } catch (error) {
    console.warn('Local skip could not schedule the next due date', error)
    return null
  }
}

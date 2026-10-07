// What the free plan includes, in one place, so the paywall copy, the UI gates
// and the save-time sanitizers can never drift apart.

// Free accounts can read the last 30 days of history/activity. Anything longer
// is a Plus window. Kept in days because the history API takes a day count.
export const FREE_HISTORY_DAYS = 30

// Free accounts get exactly one reminder per task, fired on the due date.
// Pre-due reminders ("1 day before") and follow-up nags ("3 days after") are
// what Plus unlocks, so the free tier still works as a task app.
export const FREE_REMINDER_LIMIT = 1

// Free accounts get a workspace big enough to organize a household: a handful
// of projects and a couple of saved quick filters. Plus is unlimited. Counts
// below are of what the account already has, so `>=` is the wall.
export const FREE_PROJECT_LIMIT = 5
export const FREE_QUICK_FILTER_LIMIT = 2

const isUnderLimit = (count, limit) => (Number(count) || 0) < limit

// The default project isn't a created project, so it never counts here.
export const canCreateProject = (projectCount, isPlus) =>
  Boolean(isPlus) || isUnderLimit(projectCount, FREE_PROJECT_LIMIT)

export const canCreateQuickFilter = (filterCount, isPlus) =>
  Boolean(isPlus) || isUnderLimit(filterCount, FREE_QUICK_FILTER_LIMIT)

// Reminder templates are `{ value, unit }` where value is an offset from the
// due date: 0 = on due, negative = before, positive = after.
export const isDueDateReminder = template => Number(template?.value) === 0

export const isFreeReminderTemplate = isDueDateReminder

// Drops anything the account isn't entitled to. Called at every save path so a
// stale editor state, an offline queue replay or a voice-parsed task can't
// smuggle a Plus reminder onto a free account.
export const sanitizeRemindersForPlan = (templates, isPlus) => {
  if (!Array.isArray(templates)) return []
  if (isPlus) return templates
  return templates.filter(isFreeReminderTemplate).slice(0, FREE_REMINDER_LIMIT)
}

// Clamps a requested history window to what the account can read.
export const clampHistoryDaysForPlan = (days, isPlus) => {
  if (isPlus) return days
  if (!Number.isFinite(Number(days))) return FREE_HISTORY_DAYS
  return Math.min(Number(days), FREE_HISTORY_DAYS)
}

export const isPlusHistoryWindow = days =>
  !Number.isFinite(Number(days)) || Number(days) > FREE_HISTORY_DAYS

// Oldest entry timestamp the plan can read, in epoch ms. `null` means no limit.
export const historyCutoffMs = isPlus =>
  isPlus ? null : Date.now() - FREE_HISTORY_DAYS * 24 * 60 * 60 * 1000

// Splits a history list into what the plan can show and how much sits behind
// the paywall. Used by views that receive a whole history at once (no day
// parameter to clamp), so the count can drive a concrete upsell rather than
// silently dropping rows.
export const partitionHistoryByPlan = (entries, isPlus, getTimestamp) => {
  const list = Array.isArray(entries) ? entries : []
  const cutoff = historyCutoffMs(isPlus)
  if (cutoff === null) return { visible: list, lockedCount: 0, cutoff: null }

  const visible = []
  let lockedCount = 0
  for (const entry of list) {
    const at = new Date(getTimestamp(entry)).getTime()
    // Entries with an unparseable date stay visible — hiding a row because of
    // bad data would look like data loss, not a paywall.
    if (Number.isFinite(at) && at < cutoff) lockedCount += 1
    else visible.push(entry)
  }
  return { visible, lockedCount, cutoff }
}

import { DAYS } from './WeekdayUtils.js'

// Plain `random` can hand the task straight back to the same person, so the
// app only offers the variant that skips the last assignee. Older tasks saved
// as `random` open as that option.
export const RANDOM_STRATEGY = 'random_except_last_assigned'

export const normalizeAssignStrategy = strategy =>
  strategy === 'random' ? RANDOM_STRATEGY : strategy

export const ROTATION_MODES = [
  'default',
  'completions',
  'scheduled_occurrences',
  'week',
  'month',
]

export const MAX_ROTATION_COUNT = 1000
export const ROTATION_MONTH_DAYS = Array.from({ length: 31 }, (_, i) => i + 1)

export const normalizeRotationWeekday = weekday =>
  DAYS.includes(weekday) ? weekday : 'monday'

export const normalizeRotationMonthDay = day =>
  ROTATION_MONTH_DAYS.includes(day) ? day : 1

export const isCountedRotation = mode =>
  mode === 'scheduled_occurrences' || mode === 'completions'

const NON_REPEATING_FREQUENCIES = ['once', 'no_repeat']
// Triggered and always-available tasks repeat, but have no schedule to count
// occurrences or calendar days against.
const UNSCHEDULED_FREQUENCIES = ['always', 'trigger']

// Strategies only pick the *next* assignee, so they mean nothing on a task
// that never comes back.
export const isRepeatingFrequency = frequencyType =>
  Boolean(frequencyType) && !NON_REPEATING_FREQUENCIES.includes(frequencyType)

const hasRotationPool = assignees =>
  new Set(assignees.map(({ userId }) => userId)).size > 1

// When the task passes to the next person (every N completions, weekly, …).
export const canConfigureHandOff = (strategy, frequencyType, assignees) =>
  ['round_robin', RANDOM_STRATEGY].includes(strategy) &&
  isRepeatingFrequency(frequencyType) &&
  !UNSCHEDULED_FREQUENCIES.includes(frequencyType) &&
  hasRotationPool(assignees)

// Who goes next in Round robin. Unlike the hand-off timing, the order applies
// to any repeating task.
export const canConfigureOrder = (strategy, frequencyType, assignees) =>
  strategy === 'round_robin' &&
  isRepeatingFrequency(frequencyType) &&
  hasRotationPool(assignees)

export const canConfigureRotation = (strategy, frequencyType, assignees) =>
  canConfigureHandOff(strategy, frequencyType, assignees) ||
  canConfigureOrder(strategy, frequencyType, assignees)

// Keep the user's ordering, drop ineligible IDs, and append new members.
export const reconcileRotationOrder = (order, assignees) => {
  const eligible = new Set(assignees.map(({ userId }) => userId))
  return [
    ...new Set([...(order ?? []).filter(id => eligible.has(id)), ...eligible]),
  ]
}

// A rotation is a cycle, so it reads the same starting from whoever has the
// task now; the editor lists it that way so the top row is always "now".
export const rotateToCurrent = (order, currentId) => {
  const index = order.indexOf(currentId)
  return index > 0 ? [...order.slice(index), ...order.slice(0, index)] : order
}

export const getNextInRotation = (order, currentId) =>
  order.length > 1 ? order[(order.indexOf(currentId) + 1) % order.length] : null

export const normalizeRotationCount = count =>
  Number.isSafeInteger(count)
    ? Math.min(MAX_ROTATION_COUNT, Math.max(1, count))
    : 1

export const buildAssignmentRotation = ({
  assignees,
  frequencyType,
  rotation,
  strategy,
}) => {
  if (!rotation) return null
  const handOff = canConfigureHandOff(strategy, frequencyType, assignees)
  const orderable = canConfigureOrder(strategy, frequencyType, assignees)
  if (!handOff && !orderable) return null

  const mode =
    handOff && ROTATION_MODES.includes(rotation.mode)
      ? rotation.mode
      : 'default'
  const order =
    orderable && Array.isArray(rotation.order)
      ? reconcileRotationOrder(rotation.order, assignees)
      : null
  if (mode === 'default' && !order) return null

  return {
    mode,
    ...(isCountedRotation(mode) && {
      count: normalizeRotationCount(rotation.count),
    }),
    ...(mode === 'week' && {
      weekday: normalizeRotationWeekday(rotation.weekday),
    }),
    ...(mode === 'month' && {
      dayOfMonth: normalizeRotationMonthDay(rotation.dayOfMonth),
    }),
    ...(order && { order }),
  }
}

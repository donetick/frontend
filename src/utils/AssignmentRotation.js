import { DAYS } from './WeekdayUtils.js'

export const customRotationEnabled =
  import.meta.env?.VITE_CUSTOM_ASSIGNMENT_ROTATION === 'true'

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

export const canConfigureRotation = (strategy, frequencyType, assignees) =>
  ['round_robin', 'random'].includes(strategy) &&
  Boolean(frequencyType) &&
  !['once', 'no_repeat', 'always', 'trigger'].includes(frequencyType) &&
  new Set(assignees.map(({ userId }) => userId)).size > 1

// Keep the user's ordering, drop ineligible IDs, and append new members.
export const reconcileRotationOrder = (order, assignees) => {
  const eligible = new Set(assignees.map(({ userId }) => userId))
  return [
    ...new Set([...(order ?? []).filter(id => eligible.has(id)), ...eligible]),
  ]
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
  if (!rotation || !canConfigureRotation(strategy, frequencyType, assignees)) {
    return null
  }

  const mode = ROTATION_MODES.includes(rotation.mode)
    ? rotation.mode
    : 'default'
  const order =
    strategy === 'round_robin' && Array.isArray(rotation.order)
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

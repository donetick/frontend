import {
  CalendarMonth,
  Flag,
  NotificationsNone,
  Person,
  Repeat,
  Sell,
  Toll,
} from '@mui/icons-material'
import moment from 'moment'

import { TASK_COLOR } from '../../../utils/Colors'

// Shared between the voice-capture preview card and the typed quick-add
// composer so a parsed task always renders the same way, regardless of how
// its text was captured.

export const PRIORITY_COLORS = {
  0: TASK_COLOR.NO_PRIORITY,
  1: TASK_COLOR.PRIORITY_1,
  2: TASK_COLOR.PRIORITY_2,
  3: TASK_COLOR.PRIORITY_3,
  4: TASK_COLOR.PRIORITY_4,
}

export const PRIORITY_LABELS = {
  0: '--',
  1: 'P1',
  2: 'P2',
  3: 'P3',
  4: 'P4',
}

export const formatDue = (dueDate, fmt) => {
  const m = moment(dueDate)
  return m.format('HH:mm') === '23:59'
    ? fmt.date(dueDate)
    : fmt.dateTime(dueDate)
}

// Describe structured recurrence at render time; parser names and identifiers
// remain unchanged so language switches never affect task payloads.
export const describeFrequency = (f, t, parserName) => {
  if (!f) return null
  const metadata = f.frequencyMetadata || {}
  const monthlyDay = parserName?.match(/^Every (\d+) of every month$/i)
  if (monthlyDay) {
    return t('chores:voiceToTask.frequency.monthlyOnDay', {
      day: Number(monthlyDay[1]),
    })
  }
  const dailyPeriod = parserName?.match(
    /^Every (morning|noon|afternoon|evening|night) daily$/i,
  )
  if (dailyPeriod) {
    return t('chores:voiceToTask.frequency.dailyPeriod', {
      period: t(
        `chores:voiceToTask.frequency.period.${dailyPeriod[1].toLowerCase()}`,
      ),
    })
  }
  if (f.frequencyType === 'interval') {
    const count = Number(f.frequency) || 1
    const unit = (metadata.unit || 'days').replace(/s$/, '')
    if (!['minute', 'hour', 'day', 'week', 'month', 'year'].includes(unit)) {
      return t('chores:voiceToTask.frequency.repeats')
    }
    return t('common:recurrence.interval', {
      count,
      unit: t(`common:recurrence.units.${unit}`, { count }),
    })
  }
  if (f.frequencyType === 'days_of_the_week') {
    const days = (metadata.days || [])
      .map(day => t(`chores:repeat.days.${day.toLowerCase()}`))
      .join(', ')
    if (metadata.weekPattern === 'week_of_month') {
      const occurrences = (metadata.occurrences || [])
        .map(occurrence =>
          t(`chores:repeat.ordinal.${occurrence === -1 ? 'last' : occurrence}`),
        )
        .join(', ')
      return t('chores:voiceToTask.frequency.monthlyOccurrences', {
        occurrences,
        days,
      })
    }
    return days
      ? t('chores:voiceToTask.frequency.everyDays', { days })
      : t('chores:voiceToTask.frequency.customDays')
  }
  if (f.frequencyType === 'day_of_the_month') {
    const months = (metadata.months || [])
      .map(month => t(`chores:repeat.months.${month.toLowerCase()}`))
      .join(', ')
    return t('chores:voiceToTask.frequency.onDayOfMonths', {
      day: f.frequency,
      months,
    })
  }
  const names = {
    daily: t('chores:voiceToTask.frequency.daily'),
    weekly: t('chores:voiceToTask.frequency.weekly'),
    monthly: t('chores:voiceToTask.frequency.monthly'),
    yearly: t('chores:voiceToTask.frequency.yearly'),
  }
  return names[f.frequencyType] || t('chores:voiceToTask.frequency.repeats')
}

export const buildChips = (
  effective,
  frequencyLabel,
  { canRemind, currentUserId, fmt, members },
  t,
) => {
  const chips = []
  if (effective.dueDate) {
    chips.push({
      key: 'due',
      color: 'warning',
      icon: <CalendarMonth sx={{ fontSize: 12 }} />,
      label: formatDue(effective.dueDate, fmt),
    })
  }
  if (frequencyLabel) {
    chips.push({
      key: 'repeat',
      color: 'success',
      icon: <Repeat sx={{ fontSize: 12 }} />,
      label: frequencyLabel,
    })
  }
  if (effective.priority > 0) {
    chips.push({
      key: 'priority',
      color: 'danger',
      icon: <Flag sx={{ fontSize: 12 }} />,
      label: `P${effective.priority}`,
    })
  }
  // Mirrors buildChorePayload: reminders only reach the backend for Plus
  // accounts on a task that has something to remind against
  const reminderCount = effective.notificationMetadata?.templates?.length || 0
  if (
    canRemind &&
    reminderCount > 0 &&
    (effective.dueDate || effective.frequency)
  ) {
    chips.push({
      key: 'reminders',
      color: 'neutral',
      icon: <NotificationsNone sx={{ fontSize: 12 }} />,
      label: t('chores:voiceToTask.reminder', { count: reminderCount }),
    })
  }
  if (effective.points !== null && effective.points !== undefined) {
    chips.push({
      key: 'points',
      color: 'primary',
      icon: <Toll sx={{ fontSize: 12 }} />,
      label: t('chores:voiceToTask.points', { count: effective.points }),
    })
  }
  effective.labelNames.forEach(name => {
    chips.push({
      key: `label-${name}`,
      color: 'primary',
      icon: <Sell sx={{ fontSize: 12 }} />,
      label: name,
    })
  })
  if (effective.isAnyone) {
    chips.push({
      key: 'assignee',
      color: 'neutral',
      icon: <Person sx={{ fontSize: 12 }} />,
      label: t('chores:voiceToTask.anyone'),
    })
  } else if (
    effective.assignees.length > 0 &&
    effective.assignees[0].userId !== currentUserId
  ) {
    const member = members.find(m => m.userId === effective.assignees[0].userId)
    if (member) {
      chips.push({
        key: 'assignee',
        color: 'neutral',
        icon: <Person sx={{ fontSize: 12 }} />,
        label: member.displayName,
      })
    }
  }
  return chips
}

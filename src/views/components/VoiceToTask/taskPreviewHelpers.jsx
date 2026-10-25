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

export const formatDue = dueDate => {
  const m = moment(dueDate)
  return m.format('HH:mm') === '23:59'
    ? m.format('MMM D')
    : m.format('MMM D, h:mm A')
}

// Compact description for picker-overridden frequencies where the parser's
// human name no longer applies
export const describeFrequency = (f, t) => {
  if (!f) return null
  if (f.frequencyType === 'interval') {
    const unit = f.frequencyMetadata?.unit || 'days'
    return f.frequency > 1
      ? t('chores:voiceToTask.frequency.everyN', {
          count: f.frequency,
          unit,
        })
      : t('chores:voiceToTask.frequency.everyUnit', {
          unit: unit.replace(/s$/, ''),
        })
  }
  const names = {
    daily: t('chores:voiceToTask.frequency.daily'),
    weekly: t('chores:voiceToTask.frequency.weekly'),
    monthly: t('chores:voiceToTask.frequency.monthly'),
    yearly: t('chores:voiceToTask.frequency.yearly'),
    days_of_the_week: t('chores:voiceToTask.frequency.customDays'),
    day_of_the_month: t('chores:voiceToTask.frequency.monthly'),
  }
  return names[f.frequencyType] || t('chores:voiceToTask.frequency.repeats')
}

export const buildChips = (
  effective,
  frequencyLabel,
  { canRemind, currentUserId, members },
  t,
) => {
  const chips = []
  if (effective.dueDate) {
    chips.push({
      key: 'due',
      color: 'warning',
      icon: <CalendarMonth sx={{ fontSize: 12 }} />,
      label: formatDue(effective.dueDate),
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
  if (effective.points != null) {
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

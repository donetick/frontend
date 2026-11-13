import moment from 'moment'

import i18n from '../i18n/config'
import { DAYS, sortWeekdays } from './WeekdayUtils'
const allMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]
/**
 * Get the text to display for a chore's due date
 * @param {string|null} nextDueDate - The next due date of the chore
 * @param {Object} chore - The chore object (needed for nextDueDate null check)
 * @returns {string} The formatted due date text
 */
export const getDueDateChipText = (
  nextDueDate,
  chore,
  timeFormat = 'h:mm A',
) => {
  if (chore?.nextDueDate === null || nextDueDate === null)
    return i18n.t('common:calendar.noDueDate')

  const dueDate = moment(nextDueDate)
  const diff = moment(nextDueDate).diff(moment(), 'hours')

  const calendarFormat = {
    sameDay: `[${i18n.t('common:calendar.today')}] ${timeFormat}`,
    nextDay: `[${i18n.t('common:calendar.tomorrow')}] ${timeFormat}`,
    nextWeek: `dddd ${timeFormat}`,
    lastDay: `[${i18n.t('common:calendar.yesterday')}] ${timeFormat}`,
    lastWeek: `dddd ${timeFormat}`,
    sameElse: `MMM D ${timeFormat}`,
  }

  // if time is 23:59:59, treat as end-of-day (date only, no specific time)
  if (
    dueDate.hours() === 23 &&
    dueDate.minutes() === 59 &&
    dueDate.seconds() === 59
  ) {
    if (diff < 0) {
      // For overdue dates, show calendar format for recent dates (Today/Yesterday);
      // beyond that, use a calendar-day count ("2 days") instead of a weekday name,
      // since a weekday alone doesn't convey how overdue the chore is
      const absDiff = Math.abs(diff)
      if (absDiff <= 24) {
        return moment(nextDueDate).calendar(null, calendarFormat).split(' ')[0]
      }
      if (absDiff <= 48) {
        const daysAgo = moment()
          .startOf('day')
          .diff(dueDate.clone().startOf('day'), 'days')
        return i18n.t('common:calendar.days', { count: daysAgo })
      }
      return dueDate.fromNow()
    }
    // if due in next 48 hours, show calendar format without time (e.g., "Tomorrow")
    if (diff < 48 && diff > 0) {
      return moment(nextDueDate).calendar(null, calendarFormat).split(' ')[0]
    }
    // if due date is after 48 hours, show it in format: Due in 3 days
    return dueDate.fromNow()
  }

  // if due in next 48 hours, we should show it in this format: Tomorrow 11:00
  if (diff < 48 && diff > 0) {
    return moment(nextDueDate).calendar(null, calendarFormat)
  }
  return moment(nextDueDate).fromNow()
}

/**
 * Get the color to use for a chore's due date chip
 * @param {string|null} nextDueDate - The next due date of the chore
 * @param {Object} chore - The chore object (needed for nextDueDate null check)
 * @returns {string} The color name for the chip
 */
export const getDueDateChipColor = (nextDueDate, chore) => {
  if (chore?.nextDueDate === null || nextDueDate === null) return 'neutral'

  const diff = moment(nextDueDate).diff(moment(), 'hours')

  if (diff < 48 && diff > 0) {
    return 'warning'
  }
  if (diff < 0) {
    return 'danger'
  }

  return 'neutral'
}

export const getRecurrentChipText = chore => {
  // if chore.frequencyMetadata is type string then parse it otherwise assigned to the metadata:
  const metadata =
    typeof chore.frequencyMetadata === 'string'
      ? JSON.parse(chore.frequencyMetadata)
      : chore.frequencyMetadata

  const labels = [
    'once',
    'always',
    'trigger',
    'daily',
    'adaptive',
    'weekly',
    'monthly',
    'yearly',
  ]
  if (labels.includes(chore.frequencyType)) {
    return i18n.t(`common:recurrence.${chore.frequencyType}`)
  } else if (chore.frequencyType === 'days_of_the_week') {
    const dayIndex = day =>
      typeof day === 'number' ? day : (DAYS.indexOf(day.toLowerCase()) + 1) % 7
    const days = sortWeekdays(metadata?.days || [])
    if (days.length > 4) {
      const selected = new Set(days.map(dayIndex))
      const excluded = DAYS.map(dayIndex).filter(day => !selected.has(day))
      if (!excluded.length) return i18n.t('common:recurrence.daily')
      return i18n.t('common:recurrence.dailyExcept', {
        days: excluded.map(day => moment().day(day).format('ddd')).join(', '),
      })
    } else {
      return days
        .map(day => moment().day(dayIndex(day)).format('ddd'))
        .join(', ')
    }
  } else if (chore.frequencyType === 'day_of_the_month') {
    const monthIndex = month =>
      typeof month === 'number'
        ? month
        : allMonths.findIndex(
            name => name.toLowerCase() === month.toLowerCase(),
          )
    const months = metadata?.months || allMonths
    const day = moment.localeData().ordinal(chore.frequency, 'D')
    if (months.length > 6) {
      const selected = new Set(months.map(monthIndex))
      const excluded = allMonths
        .map(monthIndex)
        .filter(month => !selected.has(month))
      return i18n.t(
        `common:recurrence.${excluded.length ? 'monthlyExcept' : 'monthlyOn'}`,
        {
          day,
          months: excluded
            .map(month => moment().month(month).format('MMM'))
            .join(', '),
        },
      )
    } else {
      return i18n.t('common:recurrence.monthsOn', {
        day,
        months: months
          .map(monthIndex)
          .sort((a, b) => a - b)
          .map(month => moment().month(month).format('MMM'))
          .join(', '),
      })
    }
  } else if (chore.frequencyType === 'interval') {
    const unitKey = `common:recurrence.units.${metadata?.unit?.replace(/s$/, '')}`
    const unit = i18n.exists(unitKey, { count: Number(chore.frequency) })
      ? i18n.t(unitKey, { count: Number(chore.frequency) })
      : metadata?.unit
    return i18n.t('common:recurrence.interval', {
      count: chore.frequency,
      unit,
    })
  } else {
    return chore.frequencyType
  }
}

import i18n from 'i18next'
import moment from 'moment'

import { DAYS, sortWeekdays } from './WeekdayUtils'

// These helpers are plain functions shared by several cards, so they read
// strings from the global i18next instance instead of taking `t` as a prop.
const tc = (key, options) => i18n.t(key, { ns: 'chores', ...options })

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
]

// Day and month names are stored in English. Turn them into indexes before
// handing them to moment: moment().day('monday') parses with the active
// locale and silently lands on Sunday for any language but English.
const weekdayIndex = day => (DAYS.indexOf(day.toLowerCase()) + 1) % 7
const monthIndex = month => MONTHS.indexOf(String(month).toLowerCase())

const calendarFormats = timeFormat => {
  const at = format => (timeFormat ? `${format} ${timeFormat}` : format)
  // Escaped so moment does not read the translation's letters as tokens.
  const literal = key =>
    at(`[${i18n.t(key, { ns: 'common' }).replace(/]/g, '')}]`)
  return {
    sameDay: literal('calendar.today'),
    nextDay: literal('calendar.tomorrow'),
    nextWeek: at('dddd'),
    lastDay: literal('calendar.yesterday'),
    lastWeek: at('dddd'),
    sameElse: at('MMM D'),
  }
}

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
    return tc('dueChip.noDueDate')

  const dueDate = moment(nextDueDate)
  const diff = moment(nextDueDate).diff(moment(), 'hours')

  // if time is 23:59:59, treat as end-of-day (date only, no specific time)
  if (
    dueDate.hours() === 23 &&
    dueDate.minutes() === 59 &&
    dueDate.seconds() === 59
  ) {
    const dateOnly = calendarFormats(null)
    if (diff < 0) {
      // For overdue dates, show calendar format for recent dates (Today/Yesterday);
      // beyond that, use a calendar-day count ("2 days") instead of a weekday name,
      // since a weekday alone doesn't convey how overdue the chore is
      const absDiff = Math.abs(diff)
      if (absDiff <= 24) {
        return moment(nextDueDate).calendar(null, dateOnly)
      }
      if (absDiff <= 48) {
        const daysAgo = moment()
          .startOf('day')
          .diff(dueDate.clone().startOf('day'), 'days')
        return tc('dueChip.days', { count: daysAgo })
      }
      return dueDate.fromNow()
    }
    // if due in next 48 hours, show calendar format without time (e.g., "Tomorrow")
    if (diff < 48 && diff > 0) {
      return moment(nextDueDate).calendar(null, dateOnly)
    }
    // if due date is after 48 hours, show it in format: Due in 3 days
    return dueDate.fromNow()
  }

  // if due in next 48 hours, we should show it in this format: Tomorrow 11:00
  if (diff < 48 && diff > 0) {
    return moment(nextDueDate).calendar(null, calendarFormats(timeFormat))
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

  const shortWeekday = day => moment().day(weekdayIndex(day)).format('ddd')
  const shortMonth = month => moment().month(monthIndex(month)).format('MMM')
  const ordinal = n => moment.localeData().ordinal(n)

  switch (chore.frequencyType) {
    case 'once':
    case 'always':
    case 'trigger':
    case 'daily':
    case 'adaptive':
    case 'weekly':
    case 'monthly':
    case 'yearly':
      return tc(`repeatChip.${chore.frequencyType}`)
    case 'days_of_the_week': {
      const days = sortWeekdays(metadata.days.map(d => d.toLowerCase()))
      if (days.length > 4) {
        const skipped = DAYS.filter(day => !days.includes(day))
        return tc('repeatChip.dailyExcept', {
          days: skipped.map(shortWeekday).join(', '),
        })
      }
      return days.map(shortWeekday).join(', ')
    }
    case 'day_of_the_month': {
      const day = ordinal(chore.frequency)
      const months = (metadata?.months || MONTHS)
        .filter(m => monthIndex(m) >= 0)
        .sort((a, b) => monthIndex(a) - monthIndex(b))
      if (months.length > 6) {
        const skipped = MONTHS.filter(
          m => !months.some(selected => monthIndex(selected) === monthIndex(m)),
        )
        if (skipped.length === 0) return tc('repeatChip.monthlyOn', { day })
        return tc('repeatChip.monthlyOnExcept', {
          day,
          months: skipped.map(shortMonth).join(', '),
        })
      }
      return tc('repeatChip.dayOfMonths', {
        day,
        months: months.map(shortMonth).join(', '),
      })
    }
    case 'interval':
      // A count of one gets its own wording ("Every week"). It can't be the
      // _one plural form, because some languages (Russian: 21, 31, …) use
      // that form for other counts too.
      if (chore.frequency === 1)
        return tc(`repeatChip.everyUnit.${metadata.unit}`, {
          defaultValue: `1 ${metadata.unit}`,
        })
      return tc(`repeatChip.every.${metadata.unit}`, {
        count: chore.frequency,
        defaultValue: `${chore.frequency} ${metadata.unit}`,
      })
    default:
      return chore.frequencyType
  }
}

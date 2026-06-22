import moment from 'moment'
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
export const getDueDateChipText = (nextDueDate, chore, timeFormat = 'h:mm A') => {
  if (chore?.nextDueDate === null || nextDueDate === null) return 'No Due Date'

  const dueDate = moment(nextDueDate)
  const diff = moment(nextDueDate).diff(moment(), 'hours')

  const calendarFormat = {
    sameDay: `[Today] ${timeFormat}`,
    nextDay: `[Tomorrow] ${timeFormat}`,
    nextWeek: `dddd ${timeFormat}`,
    lastDay: `[Yesterday] ${timeFormat}`,
    lastWeek: `[Last] dddd ${timeFormat}`,
    sameElse: `MMM D ${timeFormat}`,
  }


  // if time is 23:59:59, treat as end-of-day (date only, no specific time)
  if (dueDate.hours() === 23 && dueDate.minutes() === 59 && dueDate.seconds() === 59) {
    if (diff < 0) {
      // For overdue dates, show calendar format for recent dates
      const absDiff = Math.abs(diff)
      if (absDiff <= 48) {
        return (
          'Overdue ' +
          moment(nextDueDate).calendar(null, calendarFormat).split(' ')[0].toLowerCase()
        )
      }
      return 'Overdue ' + dueDate.fromNow()
    }
    // if due in next 48 hours, show calendar format without time (e.g., "Tomorrow")
    if (diff < 48 && diff > 0) {
      return moment(nextDueDate).calendar(null, calendarFormat).split(' ')[0]
    }
    // if due date is after 48 hours, show it in format: Due in 3 days
    return 'Due ' + dueDate.fromNow()
  }

  // if due in next 48 hours, we should show it in this format: Tomorrow 11:00
  if (diff < 48 && diff > 0) {
    return moment(nextDueDate).calendar(null, calendarFormat)
  }
  return 'Due ' + moment(nextDueDate).fromNow()
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

  const dayOfMonthSuffix = n => {
    if (n >= 11 && n <= 13) {
      return 'th'
    }
    switch (n % 10) {
      case 1:
        return 'st'
      case 2:
        return 'nd'
      case 3:
        return 'rd'
      default:
        return 'th'
    }
  }
  if (chore.frequencyType === 'once') {
    return 'Once'
  } else if (chore.frequencyType === 'trigger') {
    return 'Trigger'
  } else if (chore.frequencyType === 'adaptive') {
    return 'Adaptive'
  }

  const freq = chore.frequency || 1
  const ordinalText = pos => {
    if (pos === -1) return 'last'
    if (pos === -2) return 'next-to-last'
    return `${pos}${dayOfMonthSuffix(pos)}`
  }
  const tokenText = m => {
    switch (m?.dayToken) {
      case 'day':
        return 'day'
      case 'weekday':
        return 'weekday'
      case 'weekend':
        return 'weekend day'
      default:
        return (m?.days || []).map(d => moment().day(d).format('ddd')).join(', ')
    }
  }
  const onThe = m =>
    `${(m.setPos || []).map(ordinalText).join(', ')} ${tokenText(m)}`

  if (chore.frequencyType === 'hourly') {
    return freq > 1 ? `Every ${freq} hours` : 'Hourly'
  } else if (chore.frequencyType === 'daily') {
    return freq > 1 ? `Every ${freq} days` : 'Daily'
  } else if (chore.frequencyType === 'weekly') {
    const prefix = freq > 1 ? `Every ${freq}w` : ''
    if (metadata?.days?.length) {
      const days = metadata.days.map(d => moment().day(d).format('ddd'))
      return prefix ? `${prefix}: ${days.join(', ')}` : days.join(', ')
    }
    return freq > 1 ? `Every ${freq} weeks` : 'Weekly'
  } else if (chore.frequencyType === 'monthly') {
    const prefix = freq > 1 ? `Every ${freq}mo` : 'Monthly'
    if (metadata?.monthDays?.length) {
      const days = [...metadata.monthDays].sort((a, b) => a - b).join(', ')
      return `${prefix} on ${days}`
    }
    if (metadata?.setPos?.length) {
      return `${prefix}: ${onThe(metadata)}`
    }
    return prefix
  } else if (chore.frequencyType === 'yearly') {
    const prefix = freq > 1 ? `Every ${freq}y` : 'Yearly'
    const months = (metadata?.months || [])
      .slice()
      .sort((a, b) => allMonths.indexOf(a) - allMonths.indexOf(b))
      .map(m => moment().month(m).format('MMM'))
    if (metadata?.setPos?.length) {
      return `${prefix}: ${onThe(metadata)} of ${months.join(', ')}`
    }
    return months.length ? `${prefix} in ${months.join(', ')}` : prefix
  }
  return chore.frequencyType
}

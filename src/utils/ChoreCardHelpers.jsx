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
export const getDueDateChipText = (nextDueDate, chore) => {
  if (chore?.nextDueDate === null || nextDueDate === null) return 'No Due Date'

  const dueDate = moment(nextDueDate)
  const diff = moment(nextDueDate).diff(moment(), 'hours')

  // if seconds and minutes set to 59, treat as no time (date only)
  if (dueDate.seconds() === 59 && dueDate.minutes() === 59) {
    if (diff < 0) {
      // For overdue dates, show calendar format for recent dates
      const absDiff = Math.abs(diff)
      if (absDiff <= 48) {
        return (
          'Overdue ' +
          moment(nextDueDate).calendar().split(' at ')[0].toLowerCase()
        )
      }
      return 'Overdue ' + dueDate.fromNow()
    }
    // if due in next 48 hours, show calendar format without time (e.g., "Tomorrow")
    if (diff < 48 && diff > 0) {
      return moment(nextDueDate).calendar().split(' at ')[0]
    }
    // if due date is after 48 hours, show it in format: Due in 3 days
    return 'Due ' + dueDate.fromNow()
  }

  // if due in next 48 hours, we should show it in this format: Tomorrow 11:00 AM
  if (diff < 48 && diff > 0) {
    return moment(nextDueDate).calendar().replace(' at', '')
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
  } else if (chore.frequencyType === 'daily') {
    return 'Daily'
  } else if (chore.frequencyType === 'adaptive') {
    return 'Adaptive'
  } else if (chore.frequencyType === 'weekly') {
    return 'Weekly'
  } else if (chore.frequencyType === 'monthly') {
    return 'Monthly'
  } else if (chore.frequencyType === 'yearly') {
    return 'Yearly'
  } else if (chore.frequencyType === 'days_of_the_week') {
    let days = metadata.days
    if (days.length > 4) {
      const allDays = [
        'Sunday',
        'Monday',
        'Tuesday',
        'Wednesday',
        'Thursday',
        'Friday',
        'Saturday',
      ]
      const selectedDays = days.map(d => moment().day(d).format('dddd'))
      const notSelectedDay = allDays.filter(day => !selectedDays.includes(day))
      const notSelectedShortdays = notSelectedDay.map(d =>
        moment().day(d).format('ddd'),
      )
      return `Daily except ${notSelectedShortdays.join(', ')}`
    } else {
      days = days.map(d => moment().day(d).format('ddd'))
      return days.join(', ')
    }
  } else if (chore.frequencyType === 'day_of_the_month') {
    let months = metadata?.months ? metadata.months : allMonths
    if (months.length > 6) {
      const selectedMonths = months.map(m => moment().month(m).format('MMMM'))
      const notSelectedMonth = allMonths.filter(
        month => !selectedMonths.includes(month),
      )
      const notSelectedShortMonths = notSelectedMonth.map(m =>
        moment().month(m).format('MMM'),
      )
      let result = `Monthly ${chore.frequency}${dayOfMonthSuffix(
        chore.frequency,
      )}`
      if (notSelectedShortMonths.length > 0)
        result += `
        except ${notSelectedShortMonths.join(', ')}`
      return result
    } else {
      let freqData = metadata
      const months = freqData.months.map(m => moment().month(m).format('MMM'))
      return `${chore.frequency}${dayOfMonthSuffix(
        chore.frequency,
      )} of ${months.join(', ')}`
    }
  } else if (chore.frequencyType === 'interval') {
    return `Every ${chore.frequency} ${metadata.unit}`
  } else {
    return chore.frequencyType
  }
}

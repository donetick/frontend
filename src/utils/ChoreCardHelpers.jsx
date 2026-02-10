import moment from 'moment'

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

import moment from 'moment'

export const createDateFormatter = (
  dateFormat,
  timeFormat,
  firstDayOfWeek,
) => {
  moment.updateLocale('en', {
    week: {
      dow: firstDayOfWeek,
    },
  })

  return {
    formatDate: (date, customFormat) => {
      if (!date) return ''
      return moment(date).format(customFormat || dateFormat)
    },

    formatDateTime: (date, customFormat) => {
      if (!date) return ''
      const format = customFormat || `${dateFormat} ${timeFormat}`
      return moment(date).format(format)
    },

    formatTime: (date, customFormat) => {
      if (!date) return ''
      return moment(date).format(customFormat || timeFormat)
    },

    formatRelative: date => {
      if (!date) return ''
      return moment(date).fromNow()
    },

    formatCalendar: (date, opts) => {
      if (!date) return ''
      return moment(date).calendar(null, opts)
    },

    formatShortDate: date => {
      if (!date) return ''
      return moment(date).format('MMM D, YYYY')
    },

    formatLongDate: date => {
      if (!date) return ''
      return moment(date).format('MMMM D, YYYY')
    },

    isBefore: (date, compareDate) => {
      return moment(date).isBefore(compareDate)
    },

    isAfter: (date, compareDate) => {
      return moment(date).isAfter(compareDate)
    },

    diff: (date1, date2, unit) => {
      return moment(date1).diff(moment(date2), unit)
    },

    add: (date, amount, unit) => {
      return moment(date).add(amount, unit).toDate()
    },

    subtract: (date, amount, unit) => {
      return moment(date).subtract(amount, unit).toDate()
    },
  }
}

export const useDateFormatter = () => {
  if (typeof window === 'undefined') {
    return createDateFormatter('MM/DD/YYYY', 'h:mm A', 0)
  }

  const dateFormat = localStorage.getItem('dateFormat') || 'MM/DD/YYYY'
  const timeFormat = localStorage.getItem('timeFormat') || 'h:mm A'
  const firstDayOfWeek = parseInt(localStorage.getItem('firstDayOfWeek') || '0')

  return createDateFormatter(dateFormat, timeFormat, firstDayOfWeek)
}

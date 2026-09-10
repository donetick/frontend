/**
 * Time helpers that mirror Go's `time` package semantics closely enough for the
 * scheduler port in `src/domain/scheduler.js` to behave identically to
 * `internal/chore/scheduler.go`.
 *
 * Everything here works on UTC unless a IANA timezone is passed explicitly.
 * Go's `AddDate` normalises out-of-range values (Jan 31 + 1 month => Mar 3) and
 * so does `Date.UTC`, so the calendar arithmetic lines up for free.
 */

export const MS_PER_DAY = 24 * 60 * 60 * 1000

const WEEKDAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
]

const MONTH_NAMES = [
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

/** Lowercase Go-style weekday name ("monday") for a date, in UTC. */
export const weekdayName = date => WEEKDAY_NAMES[date.getUTCDay()]

/** Lowercase Go-style month name for a 1-based month number. */
export const monthName = month => MONTH_NAMES[month - 1]

/** Equivalent of Go's `t.AddDate(years, months, days)` in UTC. */
export const addDate = (date, years, months, days) =>
  new Date(
    Date.UTC(
      date.getUTCFullYear() + years,
      date.getUTCMonth() + months,
      date.getUTCDate() + days,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ),
  )

/** Equivalent of Go's `t.Add(d)` with `d` expressed in milliseconds. */
export const addMillis = (date, ms) => new Date(date.getTime() + ms)

/** Equivalent of Go's `time.Date(...)` with `time.UTC`. */
export const utcDate = (year, month, day, hour = 0, minute = 0, second = 0) =>
  new Date(Date.UTC(year, month - 1, day, hour, minute, second, 0))

/** Midnight UTC of the given date. */
export const truncateToDay = date =>
  utcDate(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate())

/** Last day-of-month number for a 1-based month. Mirrors `time.Date(y, m+1, 0)`. */
export const lastDayOfMonth = (year, month) =>
  new Date(Date.UTC(year, month, 0)).getUTCDate()

/**
 * Parse an RFC3339 timestamp the way Go's `time.Parse(time.RFC3339, s)` would.
 * Returns `null` when the input is not a valid RFC3339 string, which is the
 * signal callers use to take the server's error/fallback branch.
 */
export const parseRFC3339 = value => {
  if (typeof value !== 'string' || value === '') return null
  if (
    !/^\d{4}-\d{2}-\d{2}[Tt]\d{2}:\d{2}:\d{2}(\.\d+)?([Zz]|[+-]\d{2}:\d{2})$/.test(
      value,
    )
  ) {
    return null
  }
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

/** Coerce a Date | string | number | null into a Date or null. */
export const toDate = value => {
  if (value === null || typeof value === 'undefined' || value === '')
    return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

const offsetFormatterCache = new Map()

const offsetFormatter = timeZone => {
  let formatter = offsetFormatterCache.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    offsetFormatterCache.set(timeZone, formatter)
  }
  return formatter
}

/** True when the IANA timezone name is one the runtime understands. */
export const isValidTimeZone = timeZone => {
  if (!timeZone) return false
  try {
    offsetFormatter(timeZone)
    return true
  } catch {
    return false
  }
}

/** Wall-clock fields of `date` as observed in `timeZone`. */
export const zonedParts = (date, timeZone) => {
  const parts = offsetFormatter(timeZone).formatToParts(date)
  const get = type => Number(parts.find(part => part.type === type).value)
  const hour = get('hour')
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    // Intl renders midnight as 24 in some ICU versions under hour12:false.
    hour: hour === 24 ? 0 : hour,
    minute: get('minute'),
    second: get('second'),
  }
}

const zoneOffsetMs = (date, timeZone) => {
  const parts = zonedParts(date, timeZone)
  const asUTC = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  return asUTC - Math.floor(date.getTime() / 1000) * 1000
}

/** The instant at which `timeZone` shows the given wall-clock fields. */
export const zonedTimeToUTC = (parts, timeZone) => {
  const naive = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  )
  const firstGuess = new Date(naive - zoneOffsetMs(new Date(naive), timeZone))
  const corrected = new Date(naive - zoneOffsetMs(firstGuess, timeZone))
  return corrected
}

/**
 * Go's `t.In(loc).AddDate(0, 0, days).UTC()`: shift by calendar days while
 * holding the wall clock in `timeZone` steady across DST transitions.
 */
export const addDaysInZone = (date, timeZone, days) => {
  const parts = zonedParts(date, timeZone)
  const shifted = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day + days, 0, 0, 0),
  )
  return zonedTimeToUTC(
    {
      year: shifted.getUTCFullYear(),
      month: shifted.getUTCMonth() + 1,
      day: shifted.getUTCDate(),
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second,
    },
    timeZone,
  )
}

/** Lowercase Go-style weekday name for `date` as observed in `timeZone`. */
export const weekdayNameInZone = (date, timeZone) => {
  const parts = zonedParts(date, timeZone)
  return WEEKDAY_NAMES[
    new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  ]
}

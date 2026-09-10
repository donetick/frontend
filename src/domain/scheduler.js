/**
 * Faithful JS port of `internal/chore/scheduler.go` from donetick-core.
 *
 * Keeping this in lockstep with the Go implementation is what lets the client
 * advance a recurring chore's due date without a round trip. The Go test suites
 * (`scheduler_test.go`, `scheduler_adaptive_test.go`) are ported 1:1 in
 * `scheduler.test.js`; when the server scheduler changes, both sides move
 * together.
 *
 * Chores are the plain JSON objects the API returns:
 *   { frequencyType, frequency, frequencyMetadata, nextDueDate, isRolling }
 */

import {
  addDate,
  addDaysInZone,
  addMillis,
  isValidTimeZone,
  lastDayOfMonth,
  monthName,
  parseRFC3339,
  toDate,
  utcDate,
  weekdayName,
  weekdayNameInZone,
} from './time'

export const FREQUENCY_TYPES = {
  ONCE: 'once',
  DAILY: 'daily',
  WEEKLY: 'weekly',
  MONTHLY: 'monthly',
  YEARLY: 'yearly',
  ADAPTIVE: 'adaptive',
  INTERVAL: 'interval',
  DAYS_OF_THE_WEEK: 'days_of_the_week',
  DAY_OF_THE_MONTH: 'day_of_the_month',
  TRIGGER: 'trigger',
  NO_REPEAT: 'no_repeat',
}

export const WEEK_PATTERNS = {
  EVERY_WEEK: 'every_week',
  WEEK_OF_MONTH: 'week_of_month',
  WEEK_OF_QUARTER: 'week_of_quarter',
}

/** Frequency types that never produce a next due date. */
const NON_RECURRING = new Set([
  FREQUENCY_TYPES.ONCE,
  FREQUENCY_TYPES.NO_REPEAT,
  FREQUENCY_TYPES.TRIGGER,
])

/** Frequency types whose next due date takes its time-of-day from metadata. */
const TIME_FROM_METADATA = new Set([
  FREQUENCY_TYPES.DAY_OF_THE_MONTH,
  FREQUENCY_TYPES.DAYS_OF_THE_WEEK,
  FREQUENCY_TYPES.INTERVAL,
])

const HOUR_MS = 60 * 60 * 1000

const metadataOf = chore =>
  chore.frequencyMetadata ?? chore.frequencyMetadataV2 ?? {}

/**
 * Mirrors `getOccurrences`: prefers the `occurrences` field, falls back to the
 * deprecated `weekNumbers`. `-1` means "last".
 */
const getOccurrences = metadata => {
  if (Array.isArray(metadata.occurrences) && metadata.occurrences.length > 0) {
    return metadata.occurrences.map(occ => (occ === -1 ? 'last' : String(occ)))
  }
  if (Array.isArray(metadata.weekNumbers) && metadata.weekNumbers.length > 0) {
    return metadata.weekNumbers.map(String)
  }
  return []
}

/** Which occurrence of its own weekday `date` is within its month (1-based). */
const getNthOccurrenceInMonth = date =>
  Math.floor((date.getUTCDate() - 1) / 7) + 1

const isLastOccurrenceInMonth = date =>
  addDate(date, 0, 0, 7).getUTCMonth() !== date.getUTCMonth()

const quarterStartMonth = month => {
  if (month <= 3) return 1
  if (month <= 6) return 4
  if (month <= 9) return 7
  return 10
}

/** Which occurrence of its own weekday `date` is within its quarter (1-based). */
const getNthOccurrenceInQuarter = date => {
  const firstOfQuarter = utcDate(
    date.getUTCFullYear(),
    quarterStartMonth(date.getUTCMonth() + 1),
    1,
  )
  let occurrence = 0
  for (
    let d = date;
    d.getTime() >= firstOfQuarter.getTime();
    d = addDate(d, 0, 0, -7)
  ) {
    occurrence++
  }
  return occurrence
}

const isLastOccurrenceInQuarter = date => {
  const nextWeek = addDate(date, 0, 0, 7)
  if (nextWeek.getUTCFullYear() !== date.getUTCFullYear()) return true

  const month = date.getUTCMonth() + 1
  const nextMonth = nextWeek.getUTCMonth() + 1
  if (month <= 3 && nextMonth > 3) return true
  if (month <= 6 && nextMonth > 6) return true
  if (month <= 9 && nextMonth > 9) return true
  return false
}

/**
 * Mirrors `findNextDueDateForOccurrencePattern`. Walks forward day by day for
 * up to two years looking for a day that matches both the weekday set and the
 * requested occurrence (1st, 3rd, last, …).
 */
const findNextDueDateForOccurrencePattern = (
  baseDate,
  days,
  occurrences,
  isMonthly,
) => {
  const dayMap = new Set(
    (days ?? []).filter(Boolean).map(day => String(day).toLowerCase()),
  )
  const occurrenceMap = new Set(
    occurrences.map(occ => String(occ).toLowerCase()),
  )

  let currentDate = addDate(baseDate, 0, 0, 1)
  const maxSearchDays = 730

  for (let i = 0; i < maxSearchDays; i++) {
    if (dayMap.has(weekdayName(currentDate))) {
      if (isMonthly) {
        const occurrence = getNthOccurrenceInMonth(currentDate)
        if (
          occurrenceMap.has(String(occurrence)) ||
          (occurrenceMap.has('last') && isLastOccurrenceInMonth(currentDate))
        ) {
          return currentDate
        }
      } else {
        const occurrence = getNthOccurrenceInQuarter(currentDate)
        if (
          occurrenceMap.has(String(occurrence)) ||
          (occurrenceMap.has('last') && isLastOccurrenceInQuarter(currentDate))
        ) {
          return currentDate
        }
      }
    }
    currentDate = addDate(currentDate, 0, 0, 1)
  }

  throw new Error('no matching date found for the specified occurrence pattern')
}

/**
 * Port of `scheduleNextDueDate`.
 *
 * @param {object} chore
 * @param {Date|string|number} completedDate
 * @returns {Date|null} the next due date, or null for non-recurring chores.
 * @throws {Error} with the same messages the Go implementation returns.
 */
export const scheduleNextDueDate = (chore, completedDate) => {
  const frequencyType = chore.frequencyType
  if (NON_RECURRING.has(frequencyType)) return null

  const completed = toDate(completedDate)
  if (!completed) throw new Error('invalid completed date')

  const nextDueDate = toDate(chore.nextDueDate)
  const metadata = metadataOf(chore)

  let baseDate = nextDueDate ?? completed
  if (chore.isRolling) baseDate = completed

  // Time-based frequencies take their time-of-day from the frequency metadata.
  if (TIME_FROM_METADATA.has(frequencyType)) {
    // On an unparseable time the server falls back to the next due date, then
    // to "now" — same order here.
    const t = parseRFC3339(metadata.time) ?? nextDueDate ?? new Date()
    baseDate = utcDate(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth() + 1,
      baseDate.getUTCDate(),
      t.getUTCHours(),
      t.getUTCMinutes(),
      t.getUTCSeconds(),
    )
  }

  switch (frequencyType) {
    case FREQUENCY_TYPES.DAILY:
      return addDate(baseDate, 0, 0, 1)

    case FREQUENCY_TYPES.WEEKLY:
      return addDate(baseDate, 0, 0, 7)

    case FREQUENCY_TYPES.MONTHLY:
      return addDate(baseDate, 0, 1, 0)

    case FREQUENCY_TYPES.YEARLY:
      return addDate(baseDate, 1, 0, 0)

    case FREQUENCY_TYPES.ADAPTIVE: {
      // The simple in-line adaptive path; `scheduleAdaptiveNextDueDate` is the
      // history-aware one the completion flow prefers.
      if (!nextDueDate) return null
      const diff = completed.getTime() - nextDueDate.getTime()
      return addMillis(completed, diff)
    }

    case FREQUENCY_TYPES.INTERVAL: {
      const frequency = chore.frequency
      switch (metadata.unit) {
        case 'hours':
          return addMillis(baseDate, frequency * HOUR_MS)
        case 'days':
          return addDate(baseDate, 0, 0, frequency)
        case 'weeks':
          return addDate(baseDate, 0, 0, frequency * 7)
        case 'months':
          return addDate(baseDate, 0, frequency, 0)
        case 'years':
          return addDate(baseDate, frequency, 0, 0)
        default:
          throw new Error(`invalid frequency unit: ${metadata.unit}`)
      }
    }

    case FREQUENCY_TYPES.DAYS_OF_THE_WEEK: {
      const days = metadata.days ?? []
      if (days.length === 0) {
        throw new Error('days_of_the_week requires at least one day')
      }

      const weekPattern = metadata.weekPattern

      if (!weekPattern || weekPattern === WEEK_PATTERNS.EVERY_WEEK) {
        // Weekday matching happens in the chore's timezone, then converts back
        // to UTC for storage.
        const timeZone = isValidTimeZone(metadata.timezone)
          ? metadata.timezone
          : 'UTC'
        const wanted = new Set(
          days.filter(Boolean).map(day => String(day).toLowerCase()),
        )

        for (let i = 1; i <= 7; i++) {
          const candidate = addDaysInZone(baseDate, timeZone, i)
          if (wanted.has(weekdayNameInZone(candidate, timeZone)))
            return candidate
        }
        throw new Error('no matching day of the week found')
      }

      if (weekPattern === WEEK_PATTERNS.WEEK_OF_MONTH) {
        const occurrences = getOccurrences(metadata)
        if (occurrences.length === 0) {
          throw new Error('week_of_month requires at least one occurrence')
        }
        return findNextDueDateForOccurrencePattern(
          baseDate,
          days,
          occurrences,
          true,
        )
      }

      if (weekPattern === WEEK_PATTERNS.WEEK_OF_QUARTER) {
        const occurrences = getOccurrences(metadata)
        if (occurrences.length === 0) {
          throw new Error('week_of_quarter requires at least one occurrence')
        }
        return findNextDueDateForOccurrencePattern(
          baseDate,
          days,
          occurrences,
          false,
        )
      }

      throw new Error(`invalid week pattern: ${weekPattern}`)
    }

    case FREQUENCY_TYPES.DAY_OF_THE_MONTH: {
      // For day-of-the-month we take the later of completed date and due date
      // when rolling: a chore due Jan 15 completed Jan 13 must not schedule
      // backwards to Jan 15 of the same month.
      if (chore.isRolling && nextDueDate) {
        const secondAfterDueDate = addMillis(nextDueDate, 1000)
        if (completed.getTime() < secondAfterDueDate.getTime()) {
          baseDate = secondAfterDueDate
        }
      }

      const months = metadata.months ?? []
      if (months.length === 0) {
        throw new Error('day_of_the_month requires at least one month')
      }
      const frequency = chore.frequency
      if (!(frequency > 0) || frequency > 31) {
        throw new Error(`invalid day of the month: ${frequency}`)
      }

      const currentMonth = baseDate.getUTCMonth() + 1
      const startFrom =
        nextDueDate && baseDate.getUTCMonth() === nextDueDate.getUTCMonth()
          ? 1
          : 0

      const wanted = new Set(
        months.filter(Boolean).map(month => String(month).toLowerCase()),
      )

      for (let i = startFrom; i < 12 + startFrom; i++) {
        const shifted = addDate(baseDate, 0, i, 0)
        let nextMonth = (currentMonth + i) % 12
        if (nextMonth === 0) nextMonth = 12

        const targetDay = Math.min(
          frequency,
          lastDayOfMonth(shifted.getUTCFullYear(), nextMonth),
        )

        const candidate = utcDate(
          shifted.getUTCFullYear(),
          nextMonth,
          targetDay,
          shifted.getUTCHours(),
          shifted.getUTCMinutes(),
          0,
        )

        if (wanted.has(monthName(nextMonth))) return candidate
      }
      throw new Error('no matching month found')
    }

    default:
      throw new Error(`invalid frequency type: ${frequencyType}`)
  }
}

/**
 * Port of `scheduleAdaptiveNextDueDate`. Estimates the interval from the gaps
 * between recent completions, weighting recent gaps more heavily.
 *
 * @param {object} chore
 * @param {Date|string|number} completedDate
 * @param {Array<{performedAt: *}>} history most recent first, as the API returns it.
 */
export const scheduleAdaptiveNextDueDate = (
  chore,
  completedDate,
  history = [],
) => {
  const completed = toDate(completedDate)
  if (!completed) throw new Error('invalid completed date')

  const nextDueDate = toDate(chore.nextDueDate)

  const fallback = () => {
    if (!nextDueDate) return null
    const diff = completed.getTime() - nextDueDate.getTime()
    return addMillis(completed, diff)
  }

  const entries = [{ performedAt: completed }, ...(history ?? [])]
  if (entries.length < 2) return fallback()

  let totalDelay = 0
  let totalWeight = 0
  const decayFactor = 0.5

  for (let i = 0; i < entries.length - 1; i++) {
    const current = toDate(entries[i]?.performedAt)
    const next = toDate(entries[i + 1]?.performedAt)
    if (!current || !next) continue

    const delaySeconds = (current.getTime() - next.getTime()) / 1000
    const weight = Math.pow(decayFactor, i)
    totalDelay += delaySeconds * weight
    totalWeight += weight
  }

  if (totalWeight === 0) return fallback()

  const averageDelay = totalDelay / totalWeight
  // Go truncates to whole seconds via `time.Duration(averageDelay) * time.Second`.
  return addMillis(completed, Math.trunc(averageDelay) * 1000)
}

/**
 * The single entry point the completion flow uses: picks the history-aware
 * adaptive path for adaptive chores and the plain scheduler otherwise, matching
 * the server's `CompleteChore` handler.
 */
export const nextDueDateForCompletion = (
  chore,
  completedDate,
  history = [],
) => {
  if (chore.frequencyType === FREQUENCY_TYPES.ADAPTIVE) {
    return scheduleAdaptiveNextDueDate(chore, completedDate, history)
  }
  return scheduleNextDueDate(chore, completedDate)
}

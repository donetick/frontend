// Date-only values deliberately never pass through UTC conversion.
export const supportsRecurrenceBounds = type =>
  Boolean(type) && !['once', 'no_repeat', 'trigger', 'always'].includes(type)

// Two independent axes: when the task is live, and when it finishes for good.
export const PERIOD_TYPES = ['always', 'starts', 'seasonal']
export const STOP_TYPES = ['never', 'completions', 'date']

const validDate = value => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const [year, month, day] = value.split('-').map(Number)
  if (year < 1 || month < 1 || month > 12 || day < 1) return false
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)
  return (
    day <=
    [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  )
}

const blank = value => value == null || value === ''

// The pre-split shape, where one `mode` fused both axes.
const LEGACY_PERIODS = {
  none: 'always',
  absolute: 'starts',
  annual: 'seasonal',
  occurrences: 'always',
}

const fromLegacy = bounds => {
  // An unrecognized legacy mode is carried through so it still fails validation.
  const type = LEGACY_PERIODS[bounds.mode] ?? bounds.mode
  const activePeriod = { type }
  if (type === 'starts' && !blank(bounds.start))
    activePeriod.start = bounds.start
  if (type === 'seasonal') {
    if (!blank(bounds.start)) activePeriod.start = bounds.start
    if (!blank(bounds.end)) activePeriod.end = bounds.end
  }
  // A legacy absolute end becomes a stop date. Old editors never wrote an end
  // and a limit together, so preferring the date loses nothing in practice.
  if (bounds.mode === 'absolute' && !blank(bounds.end))
    return { activePeriod, stopRepeating: { type: 'date', date: bounds.end } }
  if (bounds.completionLimit != null)
    return {
      activePeriod,
      stopRepeating: {
        type: 'completions',
        completionLimit: bounds.completionLimit,
      },
    }
  return { activePeriod, stopRepeating: { type: 'never' } }
}

// Always returns both groups, so callers never branch on shape or on absence.
export const normalizeRecurrenceBounds = bounds => {
  if (!bounds || bounds.mode != null)
    return bounds
      ? fromLegacy(bounds)
      : { activePeriod: { type: 'always' }, stopRepeating: { type: 'never' } }
  return {
    activePeriod: { type: 'always', ...bounds.activePeriod },
    stopRepeating: { type: 'never', ...bounds.stopRepeating },
  }
}

// Returns a translation key, or null. Seasonal endpoints use MM-DD, not a year.
// Endpoints and limits are never carried by a type that has no use for them.
export const validateRecurrenceBounds = rawBounds => {
  if (!rawBounds) return null
  const { activePeriod, stopRepeating } = normalizeRecurrenceBounds(rawBounds)
  if (!PERIOD_TYPES.includes(activePeriod.type)) return 'invalidPeriodType'
  if (!STOP_TYPES.includes(stopRepeating.type)) return 'invalidStopType'

  const seasonal = activePeriod.type === 'seasonal'
  if (
    activePeriod.type === 'always' &&
    (activePeriod.start || activePeriod.end)
  )
    return 'invalidDate'
  if (activePeriod.type === 'starts' && activePeriod.end) return 'invalidDate'
  for (const value of [activePeriod.start, activePeriod.end]) {
    if (blank(value)) continue
    if (
      typeof value !== 'string' ||
      !validDate(seasonal ? `2000-${value}` : value)
    ) {
      return 'invalidDate'
    }
  }

  if (
    stopRepeating.type !== 'completions' &&
    stopRepeating.completionLimit != null
  )
    return 'invalidLimit'
  if (stopRepeating.type !== 'date' && !blank(stopRepeating.date))
    return 'invalidDate'
  const limit = stopRepeating.completionLimit
  if (limit != null && (!Number.isSafeInteger(limit) || limit < 1))
    return 'invalidLimit'
  if (!blank(stopRepeating.date)) {
    if (
      typeof stopRepeating.date !== 'string' ||
      !validDate(stopRepeating.date)
    )
      return 'invalidDate'
    // Seasonal windows recur, so only an absolute start can be contradicted.
    if (
      activePeriod.type === 'starts' &&
      !blank(activePeriod.start) &&
      stopRepeating.date < activePeriod.start
    ) {
      return 'stopBeforeStart'
    }
  }
  return null
}

// Drops the keys a type does not use, and the whole object when nothing is set.
export const serializeRecurrenceBounds = bounds => {
  const { activePeriod, stopRepeating } = normalizeRecurrenceBounds(bounds)
  const period = { type: activePeriod.type }
  if (activePeriod.type === 'starts' && !blank(activePeriod.start))
    period.start = activePeriod.start
  if (activePeriod.type === 'seasonal') {
    if (!blank(activePeriod.start)) period.start = activePeriod.start
    if (!blank(activePeriod.end)) period.end = activePeriod.end
  }
  const stop = { type: stopRepeating.type }
  if (stop.type === 'completions' && stopRepeating.completionLimit != null)
    stop.completionLimit = stopRepeating.completionLimit
  if (stop.type === 'date' && !blank(stopRepeating.date))
    stop.date = stopRepeating.date
  if (period.type === 'always' && stop.type === 'never') return undefined
  return { activePeriod: period, stopRepeating: stop }
}

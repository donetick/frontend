// Date-only boundaries use local calendar days, not UTC or fixed 24-hour periods.
export const customDueDateBounds = value => {
  if (!value || !['relative', 'fixed'].includes(value.mode)) return null
  let start, end
  if (value.mode === 'relative') {
    if (
      ![value.start, value.end].every(
        v =>
          typeof v === 'number' &&
          Number.isSafeInteger(v) &&
          Math.abs(v) <= 36500,
      )
    )
      return null
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    start = new Date(today)
    end = new Date(today)
    start.setDate(start.getDate() + value.start)
    end.setDate(end.getDate() + value.end)
  } else {
    const parse = text => {
      if (typeof text !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(text))
        return new Date(NaN)
      const [year, month, day] = text.split('-').map(Number)
      const date = new Date(year, month - 1, day)
      return date.getFullYear() === year &&
        date.getMonth() === month - 1 &&
        date.getDate() === day
        ? date
        : new Date(NaN)
    }
    start = parse(value.start)
    end = parse(value.end)
  }
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || start > end)
    return null
  end.setDate(end.getDate() + 1)
  return [start, end]
}

import { describe, expect, it } from 'vitest'
import { secondsToValueAndUnit, valueAndUnitToSeconds } from './DurationUtils'

// Pure functions → fast, zero-flake unit tests. This is the reference
// table-driven pattern for the frontend (see TESTING.md).

describe('secondsToValueAndUnit', () => {
  const cases = [
    { seconds: 60, expected: { value: 1, unit: 'm' } },
    { seconds: 90, expected: { value: 2, unit: 'm' } }, // rounds to nearest minute
    { seconds: 3600, expected: { value: 1, unit: 'h' } },
    { seconds: 7200, expected: { value: 2, unit: 'h' } },
    { seconds: 86400, expected: { value: 1, unit: 'd' } },
    { seconds: 172800, expected: { value: 2, unit: 'd' } },
    // Prefers the largest exact unit: 90 min is not a whole hour → minutes.
    { seconds: 5400, expected: { value: 90, unit: 'm' } },
  ]

  it.each(cases)('$seconds seconds → $expected.value$expected.unit', ({ seconds, expected }) => {
    expect(secondsToValueAndUnit(seconds)).toEqual(expected)
  })
})

describe('valueAndUnitToSeconds', () => {
  const cases = [
    { value: 1, unit: 'm', expected: 60 },
    { value: 5, unit: 'm', expected: 300 },
    { value: 1, unit: 'h', expected: 3600 },
    { value: 2, unit: 'd', expected: 172800 },
    { value: 3, unit: 'unknown', expected: 3 }, // unknown unit falls back to ×1
  ]

  it.each(cases)('$value$unit → $expected seconds', ({ value, unit, expected }) => {
    expect(valueAndUnitToSeconds(value, unit)).toBe(expected)
  })

  it('round-trips exact hour/day values', () => {
    for (const seconds of [3600, 7200, 86400, 172800]) {
      const { value, unit } = secondsToValueAndUnit(seconds)
      expect(valueAndUnitToSeconds(value, unit)).toBe(seconds)
    }
  })
})

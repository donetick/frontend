/**
 * Ported 1:1 from donetick-core:
 *   internal/chore/scheduler_test.go
 *   internal/chore/scheduler_adaptive_test.go
 *
 * The table names and expectations are kept identical to the Go originals so a
 * change on either side is easy to reconcile. Everything is UTC, matching the
 * `time.LoadLocation("UTC")` the Go tests use.
 */

import { describe, expect, it } from 'vitest'

import { scheduleAdaptiveNextDueDate, scheduleNextDueDate } from './scheduler'
import { addDate, addMillis, truncateToDay, utcDate } from './time'

const HOUR = 60 * 60 * 1000
const MINUTE = 60 * 1000

const now = utcDate(2025, 1, 2, 0, 15, 0)

const runTable = tests => {
  for (const tt of tests) {
    it(tt.name, () => {
      if (tt.wantErr) {
        expect(() => scheduleNextDueDate(tt.chore, tt.completedDate)).toThrow(
          tt.wantErrMsg,
        )
        return
      }
      const got = scheduleNextDueDate(tt.chore, tt.completedDate)
      if (tt.want === null) {
        expect(got).toBeNull()
      } else {
        expect(got?.toISOString()).toBe(tt.want.toISOString())
      }
    })
  }
}

describe('scheduleNextDueDate — basic frequencies', () => {
  runTable([
    {
      name: 'Daily',
      chore: {
        frequencyType: 'daily',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
      },
      completedDate: now,
      want: addDate(now, 0, 0, 1),
    },
    {
      name: 'Daily - (IsRolling)',
      chore: {
        frequencyType: 'daily',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
        isRolling: true,
      },
      completedDate: addDate(now, 0, 1, 0),
      want: addDate(now, 0, 1, 1),
    },
    {
      name: 'Weekly',
      chore: {
        frequencyType: 'weekly',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
      },
      completedDate: now,
      want: addDate(now, 0, 0, 7),
    },
    {
      name: 'Weekly - (IsRolling)',
      chore: {
        frequencyType: 'weekly',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
        isRolling: true,
      },
      completedDate: addDate(now, 1, 0, 0),
      want: addDate(now, 1, 0, 7),
    },
    {
      name: 'Monthly',
      chore: {
        frequencyType: 'monthly',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
      },
      completedDate: now,
      want: addDate(now, 0, 1, 0),
    },
    {
      name: 'Monthly - (IsRolling)',
      chore: {
        frequencyType: 'monthly',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
        isRolling: true,
      },
      completedDate: addDate(now, 0, 0, 2),
      want: addDate(now, 0, 1, 2),
    },
    {
      name: 'Yearly',
      chore: {
        frequencyType: 'yearly',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
      },
      completedDate: now,
      want: addDate(now, 1, 0, 0),
    },
    {
      name: 'Yearly - (IsRolling)',
      chore: {
        frequencyType: 'yearly',
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00' },
        isRolling: true,
      },
      completedDate: addDate(now, 0, 0, 2),
      want: addDate(now, 1, 0, 2),
    },
  ])
})

describe('scheduleNextDueDate — interval', () => {
  runTable([
    {
      name: 'Interval - 2 Days',
      chore: {
        frequencyType: 'interval',
        frequency: 2,
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00', unit: 'days' },
      },
      completedDate: now,
      want: addMillis(
        truncateToDay(addDate(now, 0, 0, 2)),
        18 * HOUR + 30 * MINUTE,
      ),
    },
    {
      name: 'Interval - 4 Weeks',
      chore: {
        frequencyType: 'interval',
        frequency: 4,
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00', unit: 'weeks' },
      },
      completedDate: now,
      want: addMillis(
        truncateToDay(addDate(now, 0, 0, 4 * 7)),
        18 * HOUR + 30 * MINUTE,
      ),
    },
    {
      name: 'Interval - 3 Months',
      chore: {
        frequencyType: 'interval',
        frequency: 3,
        frequencyMetadata: {
          time: '2024-07-07T14:30:00-04:00',
          unit: 'months',
        },
      },
      completedDate: now,
      want: addMillis(
        truncateToDay(addDate(now, 0, 3, 0)),
        18 * HOUR + 30 * MINUTE,
      ),
    },
    {
      name: 'Interval - 2 Years',
      chore: {
        frequencyType: 'interval',
        frequency: 2,
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00', unit: 'years' },
      },
      completedDate: now,
      want: addMillis(
        truncateToDay(addDate(now, 2, 0, 0)),
        18 * HOUR + 30 * MINUTE,
      ),
    },
    {
      name: 'Interval - 6 Hours',
      chore: {
        frequencyType: 'interval',
        frequency: 6,
        frequencyMetadata: { time: '2024-07-07T14:30:00-04:00', unit: 'hours' },
      },
      completedDate: now,
      want: addMillis(truncateToDay(now), 24 * HOUR + 30 * MINUTE),
    },
    {
      name: 'Interval - invalid unit',
      chore: {
        frequencyType: 'interval',
        frequency: 2,
        frequencyMetadata: {
          time: '2024-07-07T14:30:00-04:00',
          unit: 'fortnights',
        },
      },
      completedDate: now,
      wantErr: true,
      wantErrMsg: 'invalid frequency unit: fortnights',
    },
  ])
})

describe('scheduleNextDueDate — days of the week', () => {
  runTable([
    {
      name: 'Days of the week - next Monday',
      chore: {
        frequencyType: 'days_of_the_week',
        nextDueDate: utcDate(2025, 1, 2, 0, 12, 0),
        frequencyMetadata: {
          days: ['monday'],
          time: '2025-01-20T01:00:00-05:00',
        },
      },
      completedDate: now,
      // Jan 2 2025 is a Thursday; the next Monday is Jan 6, at 06:00 UTC.
      want: addMillis(truncateToDay(addDate(now, 0, 0, 4)), 6 * HOUR),
    },
    {
      name: 'Days of the week - no days configured',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: { days: [], time: '2025-01-20T01:00:00-05:00' },
      },
      completedDate: now,
      wantErr: true,
      wantErrMsg: 'days_of_the_week requires at least one day',
    },
  ])
})

describe('scheduleNextDueDate — day of the month', () => {
  runTable([
    {
      name: 'Day of the month - 15th of January',
      chore: {
        frequencyType: 'day_of_the_month',
        frequency: 15,
        frequencyMetadata: {
          time: '2025-01-20T14:00:00-05:00',
          unit: 'days',
          months: ['january'],
        },
      },
      completedDate: now,
      want: utcDate(2025, 1, 15, 19, 0, 0),
    },
    {
      name: 'Day of the month - 15th of January(isRolling)',
      chore: {
        frequencyType: 'day_of_the_month',
        frequency: 15,
        isRolling: true,
        frequencyMetadata: {
          time: '2025-01-20T02:00:00-05:00',
          unit: 'days',
          months: ['january'],
        },
      },
      completedDate: addDate(now, 1, 1, 0),
      want: utcDate(2027, 1, 15, 7, 0, 0),
    },
    {
      name: 'Day of the month - 15th of January(isRolling)(Completed before due date)',
      chore: {
        nextDueDate: utcDate(2025, 1, 15, 18, 0, 0),
        frequencyType: 'day_of_the_month',
        frequency: 15,
        isRolling: true,
        frequencyMetadata: {
          time: '2025-01-20T18:00:00-05:00',
          unit: 'days',
          months: ['january'],
        },
      },
      completedDate: addDate(now, 0, 0, 2),
      want: utcDate(2026, 1, 15, 18, 0, 0),
    },
  ])
})

describe('scheduleNextDueDate — non-recurring and errors', () => {
  runTable([
    {
      name: 'Once returns no next due date',
      chore: { frequencyType: 'once', frequencyMetadata: {} },
      completedDate: now,
      want: null,
    },
    {
      name: 'No repeat returns no next due date',
      chore: { frequencyType: 'no_repeat', frequencyMetadata: {} },
      completedDate: now,
      want: null,
    },
    {
      name: 'Trigger returns no next due date',
      chore: { frequencyType: 'trigger', frequencyMetadata: {} },
      completedDate: now,
      want: null,
    },
    {
      name: 'Invalid frequency Metadata',
      chore: { frequencyType: 'invalid', frequencyMetadata: {} },
      completedDate: now,
      wantErr: true,
      wantErrMsg: 'invalid frequency type: invalid',
    },
  ])
})

describe('scheduleNextDueDate — week patterns', () => {
  // January 2025:
  // Sun Mon Tue Wed Thu Fri Sat
  //           1   2   3   4
  //  5   6   7   8   9  10  11
  // 12  13  14  15  16  17  18
  // 19  20  21  22  23  24  25
  // 26  27  28  29  30  31
  const start = utcDate(2025, 1, 1, 10, 0, 0)

  runTable([
    {
      name: '1st Monday of month',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['monday'],
          time: '2025-01-06T10:00:00Z',
          weekPattern: 'week_of_month',
          occurrences: [1],
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 6, 10, 0, 0),
    },
    {
      name: '2nd Tuesday of month',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['tuesday'],
          time: '2025-01-14T14:30:00Z',
          weekPattern: 'week_of_month',
          occurrences: [2],
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 14, 14, 30, 0),
    },
    {
      name: '1st Friday of quarter',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['friday'],
          time: '2025-01-03T09:00:00Z',
          weekPattern: 'week_of_quarter',
          occurrences: [1],
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 3, 9, 0, 0),
    },
    {
      name: 'Every week pattern (default behavior)',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['wednesday'],
          time: '2025-01-08T16:00:00Z',
          weekPattern: 'every_week',
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 8, 16, 0, 0),
    },
    {
      name: 'No week pattern specified (default behavior)',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: { days: ['saturday'], time: '2025-01-04T12:00:00Z' },
      },
      completedDate: start,
      want: utcDate(2025, 1, 4, 12, 0, 0),
    },
    {
      name: '1st and 3rd Monday of month',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['monday'],
          time: '2025-01-03T08:00:00Z',
          weekPattern: 'week_of_month',
          occurrences: [1, 3],
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 6, 8, 0, 0),
    },
    {
      name: 'Last Friday of month',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['friday'],
          time: '2025-01-31T17:00:00Z',
          weekPattern: 'week_of_month',
          occurrences: [-1],
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 31, 17, 0, 0),
    },
    {
      name: 'Error - week_of_month without occurrences',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['monday'],
          time: '2025-01-06T10:00:00Z',
          weekPattern: 'week_of_month',
          occurrences: [],
        },
      },
      completedDate: start,
      wantErr: true,
      wantErrMsg: 'week_of_month requires at least one occurrence',
    },
    {
      name: 'Error - week_of_quarter without occurrences',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['friday'],
          time: '2025-01-03T09:00:00Z',
          weekPattern: 'week_of_quarter',
          occurrences: [],
        },
      },
      completedDate: start,
      wantErr: true,
      wantErrMsg: 'week_of_quarter requires at least one occurrence',
    },
    {
      name: 'Backward compatibility - legacy WeekNumbers',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['monday'],
          time: '2025-01-06T10:00:00Z',
          weekPattern: 'week_of_month',
          weekNumbers: [1],
        },
      },
      completedDate: start,
      want: utcDate(2025, 1, 6, 10, 0, 0),
    },
    {
      name: 'Error - invalid week pattern',
      chore: {
        frequencyType: 'days_of_the_week',
        frequencyMetadata: {
          days: ['monday'],
          time: '2025-01-06T10:00:00Z',
          weekPattern: 'week_of_decade',
        },
      },
      completedDate: start,
      wantErr: true,
      wantErrMsg: 'invalid week pattern: week_of_decade',
    },
  ])
})

describe('scheduleNextDueDate — timezone handling', () => {
  it('resolves the weekday in the chore timezone, not UTC', () => {
    // 2025-01-03T02:00Z is still Thursday Jan 2, 21:00 in New York. Searching
    // forward from the next local day finds Friday Jan 3 local = Jan 4 02:00Z.
    // Doing the same search in UTC would see Friday already and skip a week to
    // Jan 10, so this pins the timezone-aware branch.
    const chore = {
      frequencyType: 'days_of_the_week',
      nextDueDate: '2025-01-03T02:00:00Z',
      frequencyMetadata: {
        days: ['friday'],
        time: '2025-01-03T02:00:00Z',
        timezone: 'America/New_York',
      },
    }
    const got = scheduleNextDueDate(chore, utcDate(2025, 1, 3, 2, 0, 0))
    expect(got.toISOString()).toBe('2025-01-04T02:00:00.000Z')
  })

  it('falls back to UTC for an unknown timezone', () => {
    const chore = {
      frequencyType: 'days_of_the_week',
      frequencyMetadata: {
        days: ['saturday'],
        time: '2025-01-04T12:00:00Z',
        timezone: 'Mars/Olympus_Mons',
      },
    }
    const got = scheduleNextDueDate(chore, utcDate(2025, 1, 1, 10, 0, 0))
    expect(got.toISOString()).toBe(utcDate(2025, 1, 4, 12, 0, 0).toISOString())
  })
})

describe('scheduleAdaptiveNextDueDate', () => {
  const base = new Date('2025-06-01T12:00:00Z')
  const hours = n => new Date(base.getTime() + n * HOUR)

  it('handles history entries with null performedAt', () => {
    const got = scheduleAdaptiveNextDueDate(
      { frequencyType: 'adaptive', nextDueDate: hours(24) },
      base,
      [{ performedAt: null }, { performedAt: null }, { performedAt: null }],
    )
    expect(got).not.toBeNull()
  })

  it('handles mixed null and valid performedAt entries', () => {
    const got = scheduleAdaptiveNextDueDate(
      { frequencyType: 'adaptive' },
      base,
      [
        { performedAt: hours(-24) },
        { performedAt: hours(-48) },
        { performedAt: null },
        { performedAt: hours(-96) },
      ],
    )
    expect(got).not.toBeNull()
  })

  it('handles a single history entry with null performedAt', () => {
    const got = scheduleAdaptiveNextDueDate(
      { frequencyType: 'adaptive', nextDueDate: hours(24) },
      base,
      [{ performedAt: null }],
    )
    expect(got).not.toBeNull()
  })

  it('falls back to the due-date delta on empty history', () => {
    const got = scheduleAdaptiveNextDueDate(
      { frequencyType: 'adaptive', nextDueDate: hours(24) },
      base,
      [],
    )
    // completed - due = -24h, so next = completed - 24h.
    expect(got.toISOString()).toBe(hours(-24).toISOString())
  })

  it('returns null on empty history without a next due date', () => {
    const got = scheduleAdaptiveNextDueDate(
      { frequencyType: 'adaptive', nextDueDate: null },
      base,
      [],
    )
    expect(got).toBeNull()
  })

  it('estimates roughly the historical interval', () => {
    const got = scheduleAdaptiveNextDueDate(
      { frequencyType: 'adaptive' },
      base,
      [
        { performedAt: hours(-24) },
        { performedAt: hours(-48) },
        { performedAt: hours(-72) },
      ],
    )
    expect(got).not.toBeNull()
    // Within an hour of "24h from now", matching the Go assertion.
    expect(Math.abs(got.getTime() - hours(24).getTime())).toBeLessThan(HOUR)
  })
})

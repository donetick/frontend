import 'moment/locale/es.js'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { transformSync } from '@swc/core'
import moment from 'moment'

import * as weekdayUtils from '../src/utils/WeekdayUtils.js'

// Load the complete production helper without mounting React. SWC handles the
// .jsx module, and every dependency (including Moment) is the real package/code.
const require = createRequire(import.meta.url)
const source = readFileSync(
  new URL('../src/utils/ChoreCardHelpers.jsx', import.meta.url),
  'utf8',
)
const { code } = transformSync(source, {
  jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022' },
  module: { type: 'commonjs' },
})
const exports = {}
vm.runInNewContext(code, {
  exports,
  require: name => (name === './WeekdayUtils' ? weekdayUtils : require(name)),
})
const { getRecurrentChipText } = exports

// Literal expectations catch English-key parsing under a non-English locale,
// wrong weekday/month indices, and localized-vs-canonical complement comparisons.
const dayCases = [
  [
    'three days',
    ['friday', 'monday', 'wednesday'],
    'Mon, Wed, Fri',
    'lun., mié., vie.',
  ],
  ['Sunday', ['sunday'], 'Sun', 'dom.'],
  [
    'Sunday wrap',
    ['sunday', 'saturday', 'monday'],
    'Mon, Sat, Sun',
    'lun., sáb., dom.',
  ],
  [
    'five weekdays',
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
    'Daily except Sat, Sun',
    'Daily except sáb., dom.',
  ],
  [
    'five days including Sunday',
    ['monday', 'wednesday', 'friday', 'saturday', 'sunday'],
    'Daily except Tue, Thu',
    'Daily except mar., jue.',
  ],
  [
    'six days',
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    'Daily except Sun',
    'Daily except dom.',
  ],
  [
    'all seven days',
    [
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday',
    ],
    'Daily except ',
    'Daily except ',
  ],
  ['empty days', [], '', ''],
]
const monthCases = [
  ['January', ['january'], '3rd of Jan', '3rd of ene.'],
  ['legacy Title Case', ['January'], '3rd of Jan', '3rd of ene.'],
  [
    'unsorted mixed case',
    ['December', 'june', 'January'],
    '3rd of Jan, Jun, Dec',
    '3rd of ene., jun., dic.',
  ],
  [
    'six months',
    ['june', 'january', 'may', 'february', 'april', 'march'],
    '3rd of Jan, Feb, Mar, Apr, May, Jun',
    '3rd of ene., feb., mar., abr., may., jun.',
  ],
  [
    'seven months',
    ['january', 'february', 'march', 'april', 'may', 'june', 'july'],
    'Monthly 3rd\n        except Aug, Sep, Oct, Nov, Dec',
    'Monthly 3rd\n        except ago., sep., oct., nov., dic.',
  ],
  [
    'seven Title Case months',
    ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    'Monthly 3rd\n        except Aug, Sep, Oct, Nov, Dec',
    'Monthly 3rd\n        except ago., sep., oct., nov., dic.',
  ],
  [
    'eleven months excluding January',
    [
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
    ],
    'Monthly 3rd\n        except Jan',
    'Monthly 3rd\n        except ene.',
  ],
  [
    'all twelve months',
    [
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
    ],
    'Monthly 3rd',
    'Monthly 3rd',
  ],
  [
    'all twelve Title Case months',
    [
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
    ],
    'Monthly 3rd',
    'Monthly 3rd',
  ],
  ['default months', undefined, 'Monthly 3rd', 'Monthly 3rd'],
  ['empty months', [], '3rd of ', '3rd of '],
]

for (const [locale, expectedIndex] of [
  ['en', 2],
  ['es', 3],
]) {
  for (const encoding of ['object', 'JSON string']) {
    for (const [type, field, cases] of [
      ['days_of_the_week', 'days', dayCases],
      ['day_of_the_month', 'months', monthCases],
    ]) {
      for (const fixture of cases) {
        test(`${locale}: ${fixture[0]}, ${encoding} metadata`, () => {
          const previousLocale = moment.locale()
          const previousNow = moment.now
          try {
            moment.locale(locale)
            // Make invalid month parsing deterministic without mocking Moment.
            moment.now = () => Date.UTC(2026, 9, 27, 12)
            const metadata = Object.freeze({
              [field]: fixture[1] && Object.freeze([...fixture[1]]),
            })
            const chore = Object.freeze({
              frequencyType: type,
              frequency: 3,
              frequencyMetadata:
                encoding === 'object' ? metadata : JSON.stringify(metadata),
            })
            assert.equal(getRecurrentChipText(chore), fixture[expectedIndex])
            assert.equal(moment.locale(), locale)
          } finally {
            moment.locale(previousLocale)
            moment.now = previousNow
          }
        })
      }
    }
  }
}

test('other recurrence types and ordinal suffixes keep existing wording', () => {
  for (const [frequencyType, expected] of [
    ['once', 'Once'],
    ['always', 'Always'],
    ['trigger', 'Trigger'],
    ['daily', 'Daily'],
    ['adaptive', 'Adaptive'],
    ['weekly', 'Weekly'],
    ['monthly', 'Monthly'],
    ['yearly', 'Yearly'],
    ['custom', 'custom'],
  ]) {
    assert.equal(getRecurrentChipText({ frequencyType }), expected)
  }
  assert.equal(
    getRecurrentChipText({
      frequencyType: 'interval',
      frequency: 2,
      frequencyMetadata: { unit: 'weeks' },
    }),
    'Every 2 weeks',
  )
  for (const [frequency, expected] of [
    [1, 'Monthly 1st'],
    [2, 'Monthly 2nd'],
    [3, 'Monthly 3rd'],
    [11, 'Monthly 11th'],
    [12, 'Monthly 12th'],
    [13, 'Monthly 13th'],
    [21, 'Monthly 21st'],
    [22, 'Monthly 22nd'],
    [23, 'Monthly 23rd'],
    [31, 'Monthly 31st'],
  ]) {
    assert.equal(
      getRecurrentChipText({ frequencyType: 'day_of_the_month', frequency }),
      expected,
    )
  }
})

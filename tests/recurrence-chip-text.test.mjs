import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

import * as weekdayUtils from '../src/utils/WeekdayUtils.js'

// Run the real helper against the real moment, with a non-English locale
// loaded, the way the app does after LocalizationContext calls moment.locale.
const require = createRequire(import.meta.url)
const moment = require('moment')
require('moment/locale/es')

const source = readFileSync(
  new URL('../src/utils/ChoreCardHelpers.jsx', import.meta.url),
  'utf8',
)
const { code } = transformSync(source, {
  jsc: {
    parser: { syntax: 'ecmascript', jsx: true },
    target: 'es2022',
  },
  module: { type: 'commonjs' },
})
const modules = {
  moment: { default: moment, __esModule: true },
  './WeekdayUtils': weekdayUtils,
}
const exports = {}
vm.runInNewContext(code, {
  exports,
  require: name => {
    assert.ok(modules[name], `Unexpected import: ${name}`)
    return modules[name]
  },
})
const { getRecurrentChipText } = exports

// Always restore English, even when an assertion fails, so a failure here
// cannot leak a locale into later assertions.
const withLocale = (locale, fn) => {
  moment.locale(locale)
  try {
    fn()
  } finally {
    moment.locale('en')
  }
}

const weekly = days => ({
  frequencyType: 'days_of_the_week',
  frequencyMetadata: JSON.stringify({ days }),
})
const monthly = months => ({
  frequencyType: 'day_of_the_month',
  frequency: 15,
  frequencyMetadata: months ? { months } : {},
})

test('weekdays keep their identity under a non-English locale', () => {
  withLocale('es', () => {
    assert.equal(
      getRecurrentChipText(weekly(['friday', 'monday', 'wednesday'])),
      'lun., mié., vie.',
    )
    assert.equal(getRecurrentChipText(weekly(['sunday'])), 'dom.')
  })
})

test('daily except lists only the unselected weekdays', () => {
  withLocale('es', () => {
    assert.equal(
      getRecurrentChipText(
        weekly(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
      ),
      'Daily except sáb., dom.',
    )
  })
})

test('a few selected months are named and sorted by calendar order', () => {
  withLocale('es', () => {
    assert.equal(
      getRecurrentChipText(monthly(['march', 'january'])),
      '15th of ene., mar.',
    )
  })
})

test('many selected months list only the missing ones', () => {
  const months = [
    'january',
    'february',
    'march',
    'april',
    'may',
    'june',
    'july',
    'september',
    'october',
    'november',
  ]
  withLocale('es', () => {
    assert.match(
      getRecurrentChipText(monthly(months)),
      /^Monthly 15th\s+except ago\., dic\.$/,
    )
  })
})

test('missing month metadata falls back to every month', () => {
  withLocale('es', () => {
    assert.equal(getRecurrentChipText(monthly()), 'Monthly 15th')
  })
})

test('English output is unchanged apart from month order', () => {
  withLocale('en', () => {
    assert.equal(
      getRecurrentChipText(weekly(['wednesday', 'monday'])),
      'Mon, Wed',
    )
    assert.equal(
      getRecurrentChipText(
        weekly(['monday', 'tuesday', 'wednesday', 'thursday', 'saturday']),
      ),
      'Daily except Fri, Sun',
    )
    assert.equal(
      getRecurrentChipText(monthly(['march', 'january'])),
      '15th of Jan, Mar',
    )
    assert.equal(getRecurrentChipText(monthly()), 'Monthly 15th')
  })
})

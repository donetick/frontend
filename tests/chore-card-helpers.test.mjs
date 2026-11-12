import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { test } from 'node:test'
import vm from 'node:vm'

import { transformSync } from '@swc/core'

// Run the real helpers against real moment locales and a real i18next instance
// loaded with the shipped locale files.
const require = createRequire(import.meta.url)
const moment = require('moment')
const i18next = require('i18next')
require('moment/locale/de')
require('moment/locale/ar')
moment.updateLocale('ar', { postformat: string => string })
moment.locale('en')

const localesDir = new URL('../public/locales/', import.meta.url)
const readLocale = (lang, ns) =>
  JSON.parse(readFileSync(new URL(`${lang}/${ns}.json`, localesDir), 'utf8'))
const languages = ['en', 'de', 'ar']
await i18next.init({
  defaultNS: 'common',
  fallbackLng: 'en',
  initImmediate: false,
  showSupportNotice: false,
  interpolation: { escapeValue: false },
  lng: 'en',
  ns: ['common', 'chores'],
  resources: Object.fromEntries(
    languages.map(lang => [
      lang,
      {
        chores: readLocale(lang, 'chores'),
        common: readLocale(lang, 'common'),
      },
    ]),
  ),
})

const load = path =>
  transformSync(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    jsc: { parser: { syntax: 'ecmascript', jsx: true }, target: 'es2022' },
    module: { type: 'commonjs' },
  }).code
const run = (code, modules) => {
  const module = { exports: {} }
  vm.runInNewContext(code, {
    exports: module.exports,
    module,
    require: name => modules[name],
  })
  return module.exports
}
const weekdayUtils = run(load('../src/utils/WeekdayUtils.js'), {})
const helpers = run(load('../src/utils/ChoreCardHelpers.jsx'), {
  i18next: { __esModule: true, default: i18next },
  moment: { __esModule: true, default: moment },
  './WeekdayUtils': weekdayUtils,
})

const inLocale = async (locale, fn) => {
  const previous = moment.locale()
  moment.locale(locale)
  await i18next.changeLanguage(locale)
  try {
    return fn()
  } finally {
    moment.locale(previous)
    await i18next.changeLanguage('en')
  }
}

const weekly = days => ({
  frequencyType: 'days_of_the_week',
  frequencyMetadata: JSON.stringify({ days }),
})
const every = (frequency, unit) =>
  helpers.getRecurrentChipText({
    frequency,
    frequencyType: 'interval',
    frequencyMetadata: { unit },
  })

test('weekday chips name the stored days in the active language', async () => {
  const chore = weekly(['monday', 'thursday', 'saturday', 'sunday'])
  assert.equal(
    await inLocale('en', () => helpers.getRecurrentChipText(chore)),
    'Mon, Thu, Sat, Sun',
  )
  assert.equal(
    await inLocale('de', () => helpers.getRecurrentChipText(chore)),
    'Mo., Do., Sa., So.',
  )
})

test('daily-except chips list the skipped days, not all seven', async () => {
  const chore = weekly(['monday', 'tuesday', 'wednesday', 'thursday', 'friday'])
  assert.equal(
    await inLocale('en', () => helpers.getRecurrentChipText(chore)),
    'Daily except Sat, Sun',
  )
  assert.equal(
    await inLocale('de', () => helpers.getRecurrentChipText(chore)),
    'Täglich außer Sa., So.',
  )
})

test('day-of-month chips use locale ordinals and month names', async () => {
  const chore = {
    frequency: 3,
    frequencyType: 'day_of_the_month',
    frequencyMetadata: { months: ['march', 'january'] },
  }
  assert.equal(
    await inLocale('en', () => helpers.getRecurrentChipText(chore)),
    '3rd of Jan, Mar',
  )
  assert.equal(
    await inLocale('de', () => helpers.getRecurrentChipText(chore)),
    'Am 3. im Jan., März',
  )
})

test('monthly chips name only the skipped months', async () => {
  const all = [
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
  const chore = months => ({
    frequency: 1,
    frequencyType: 'day_of_the_month',
    frequencyMetadata: { months },
  })
  assert.equal(
    await inLocale('en', () => helpers.getRecurrentChipText(chore(all))),
    'Monthly 1st',
  )
  assert.equal(
    await inLocale('en', () =>
      helpers.getRecurrentChipText(chore(all.filter(m => m !== 'july'))),
    ),
    'Monthly 1st except Jul',
  )
  assert.equal(
    await inLocale('de', () =>
      helpers.getRecurrentChipText(chore(all.filter(m => m !== 'july'))),
    ),
    'Monatlich am 1. außer Juli',
  )
})

test('interval chips use every plural form of the language', async () => {
  assert.equal(every(1, 'weeks'), 'Every week')
  assert.equal(every(3, 'days'), 'Every 3 days')
  assert.equal(await inLocale('de', () => every(3, 'days')), 'Alle 3 Tage')
  // Arabic has a dual and a 3–10 form that a plain _one/_other pair misses.
  assert.equal(await inLocale('ar', () => every(2, 'days')), 'كل يومين')
  assert.equal(await inLocale('ar', () => every(3, 'days')), 'كل 3 أيام')
  assert.equal(await inLocale('de', () => every(1, 'weeks')), 'Jede Woche')
})

test('due chips translate the calendar words and use moment for the rest', async () => {
  const tomorrow = moment().add(1, 'day').hour(7).minute(30).second(0)
  assert.equal(
    await inLocale('de', () =>
      helpers.getDueDateChipText(tomorrow.toISOString(), {}, 'HH:mm'),
    ),
    'Morgen 07:30',
  )
  const late = moment().subtract(15, 'hours').toISOString()
  assert.equal(
    await inLocale('de', () => helpers.getDueDateChipText(late, {})),
    'vor 15 Stunden',
  )
  assert.equal(
    await inLocale('ar', () => helpers.getDueDateChipText(late, {})),
    'منذ 15 ساعة',
  )
  assert.equal(helpers.getDueDateChipText(null, {}), 'No Due Date')
})

test('date-only due chips keep multi-word calendar labels whole', () => {
  const endOfTomorrow = moment()
    .add(1, 'day')
    .hour(23)
    .minute(59)
    .second(59)
    .toISOString()
  assert.equal(helpers.getDueDateChipText(endOfTomorrow, {}), 'Tomorrow')
})

test('every locale with the chip strings has all of its plural forms', () => {
  const english = readLocale('en', 'chores')
  const pluralBases = [
    ['dueChip', 'days'],
    ...Object.keys(english.repeatChip.every)
      .filter(key => key.endsWith('_other'))
      .map(key => ['repeatChip.every', key.replace(/_other$/, '')]),
  ]
  const locales = readdirSync(localesDir).filter(
    lang => !lang.includes('-') && lang !== 'en',
  )
  for (const lang of locales) {
    const chores = readLocale(lang, 'chores')
    if (!chores.repeatChip) continue
    const categories = new Intl.PluralRules(lang).resolvedOptions()
      .pluralCategories
    for (const [path, base] of pluralBases) {
      const node = path.split('.').reduce((n, part) => n?.[part], chores)
      for (const category of categories) {
        assert.ok(
          node?.[`${base}_${category}`],
          `${lang}: ${path}.${base}_${category} is missing`,
        )
      }
    }
  }
})

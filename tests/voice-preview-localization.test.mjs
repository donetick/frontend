import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import i18next from 'i18next'
import moment from 'moment'

const read = file =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const resources = Object.fromEntries(
  ['en', 'zh-CN'].map(language => [
    language,
    Object.fromEntries(
      ['common', 'chores'].map(namespace => [
        namespace,
        JSON.parse(read(`public/locales/${language}/${namespace}.json`)),
      ]),
    ),
  ]),
)
const i18n = i18next.createInstance()
await i18n.init({
  lng: 'zh-CN',
  fallbackLng: 'en',
  resources,
  initImmediate: false,
})
const t = i18n.t.bind(i18n)
const helpersSource = read(
  'src/views/components/VoiceToTask/taskPreviewHelpers.jsx',
)
const describeSource = helpersSource
  .slice(
    helpersSource.indexOf('export const describeFrequency'),
    helpersSource.indexOf('export const buildChips'),
  )
  .replace('export const', 'const')
const describeFrequency = new Function(
  `${describeSource}; return describeFrequency`,
)()
const parserSource = read('src/views/components/CustomParsers.js').replace(
  /export const /g,
  'const ',
)
const parseRepeatV2 = new Function(`${parserSource}; return parseRepeatV2`)()
const describe = sentence => {
  const parsed = parseRepeatV2(sentence)
  assert.ok(parsed.result, `Expected recurrence in: ${sentence}`)
  const before = JSON.stringify(parsed.result)
  const label = describeFrequency(parsed.result, t, parsed.name)
  assert.equal(
    JSON.stringify(parsed.result),
    before,
    'Display must preserve parser payload',
  )
  return label
}

test('Chinese voice intervals localize raw singular and plural parser units', () => {
  assert.equal(describe('water every 2 days'), '每 2 天')
  assert.equal(describe('water every day'), '每 1 天')
  assert.equal(describe('water every other week'), '每 2 周')
  assert.equal(
    describeFrequency(
      {
        frequencyType: 'interval',
        frequency: 2,
        frequencyMetadata: { unit: 'fortnights' },
      },
      t,
    ),
    '重复',
  )
})

test('Chinese voice recurrence preserves detailed monthly dates and day periods', () => {
  assert.equal(describe('pay 15th of every month'), '每月 15 日')
  assert.equal(describe('water every morning'), '每天早晨')
  assert.equal(describe('water every night'), '每天晚上')
})

test('Chinese voice weekdays, monthly occurrences, and month arrays use translated identifiers', () => {
  assert.equal(describe('water every monday and friday'), '每星期一, 星期五')
  assert.equal(describe('water first monday of the month'), '每月第一个星期一')
  assert.equal(
    describe('water 15th of january and february'),
    '一月, 二月的 15 日',
  )
})

test('voice recurrence can switch back to English without reparsing metadata', async () => {
  await i18n.changeLanguage('en')
  try {
    assert.equal(describe('water every 2 days'), 'Every 2 days')
    assert.equal(describe('pay 15th of every month'), 'Every month on day 15')
    assert.equal(
      describe('water every monday and friday'),
      'Every Monday, Friday',
    )
  } finally {
    await i18n.changeLanguage('zh-CN')
  }
})

test('voice due-date previews delegate to the selected date and time format', () => {
  const formatSource = helpersSource
    .slice(
      helpersSource.indexOf('export const formatDue'),
      helpersSource.indexOf('// Describe structured recurrence'),
    )
    .replace('export const', 'const')
  const formatDue = new Function('moment', `${formatSource}; return formatDue`)(
    moment,
  )
  const fmt = {
    date: value => moment(value).format('YYYY-MM-DD'),
    dateTime: value => moment(value).format('YYYY-MM-DD HH:mm'),
  }
  assert.equal(formatDue('2026-11-02T23:59:59', fmt), '2026-11-02')
  assert.equal(formatDue('2026-11-02T18:30:00', fmt), '2026-11-02 18:30')
})

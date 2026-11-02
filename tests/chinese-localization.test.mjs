import 'moment/locale/zh-cn.js'

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'

import { buildSync } from 'esbuild'
import i18next from 'i18next'
import moment from 'moment'

const read = file =>
  readFileSync(new URL(`../${file}`, import.meta.url), 'utf8')
const en = JSON.parse(read('public/locales/en/common.json'))
const zh = JSON.parse(read('public/locales/zh-CN/common.json'))
const i18n = i18next.createInstance()
await i18n.init({
  lng: 'zh-CN',
  fallbackLng: 'en',
  resources: { en: { common: en }, 'zh-CN': { common: zh } },
  defaultNS: 'common',
  initImmediate: false,
})
const source = read('src/utils/ChoreCardHelpers.jsx')
  .replace(/^import .*$/gm, '')
  .replace(/export const /g, 'const ')
const DAYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]
const helpers = new Function(
  'moment',
  'i18n',
  'DAYS',
  'sortWeekdays',
  `${source};return {getDueDateChipText,getRecurrentChipText}`,
)(moment, i18n, DAYS, days =>
  [...days].sort((a, b) => DAYS.indexOf(a) - DAYS.indexOf(b)),
)

test('Chinese recurrence labels and interval units use the selected language', () => {
  moment.locale('zh-cn')
  assert.equal(helpers.getRecurrentChipText({ frequencyType: 'daily' }), '每天')
  assert.equal(
    helpers.getRecurrentChipText({
      frequencyType: 'interval',
      frequency: 3,
      frequencyMetadata: { unit: 'months' },
    }),
    '每 3 个月',
  )
  assert.equal(helpers.getDueDateChipText(null), '无到期日期')
})

test('recurrence exclusions compare weekday and month identifiers before translating', () => {
  moment.locale('zh-cn')
  const weekdays = helpers.getRecurrentChipText({
    frequencyType: 'days_of_the_week',
    frequencyMetadata: { days: DAYS.slice(0, 5) },
  })
  assert.match(weekdays, /周六|星期六/)
  assert.match(weekdays, /周日|星期日/)
  assert.doesNotMatch(weekdays, /周一|星期一/)
  assert.equal(
    helpers.getRecurrentChipText({
      frequencyType: 'days_of_the_week',
      frequencyMetadata: { days: DAYS },
    }),
    '每天',
  )
  const months = helpers.getRecurrentChipText({
    frequencyType: 'day_of_the_month',
    frequency: 15,
    frequencyMetadata: {
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
    },
  })
  assert.match(months, /15/)
  assert.match(months, /8月/)
  assert.doesNotMatch(months, /(?:^|[,，\s])1月/)
})

test('English recurrence remains available after switching back', async () => {
  await i18n.changeLanguage('en')
  moment.locale('en')
  assert.equal(
    helpers.getRecurrentChipText({ frequencyType: 'daily' }),
    'Daily',
  )
  assert.equal(
    helpers.getRecurrentChipText({
      frequencyType: 'interval',
      frequency: 3,
      frequencyMetadata: { unit: 'months' },
    }),
    'Every 3 months',
  )
  await i18n.changeLanguage('zh-CN')
})

test('Moment Chinese locale is explicitly registered by the application', () => {
  assert.match(
    read('src/i18n/config.js'),
    /import ['"]moment\/(?:dist\/)?locale\/zh-cn['"]/,
  )
})

test('browser bundle registers Chinese on the Moment instance used by the app', () => {
  const localeImport = read('src/i18n/config.js').match(
    /import ['"](moment\/(?:dist\/)?locale\/zh-cn)['"]/,
  )[1]
  const result = buildSync({
    stdin: {
      contents: `import moment from 'moment'; import '${localeImport}'; globalThis.month = moment('2026-01-15').locale('zh-cn').format('MMMM');`,
      resolveDir: new URL('..', import.meta.url).pathname,
    },
    bundle: true,
    platform: 'browser',
    mainFields: ['browser', 'module', 'jsnext:main', 'jsnext', 'main'],
    format: 'iife',
    write: false,
    logLevel: 'silent',
  })
  const context = {}
  vm.runInNewContext(result.outputFiles[0].text, context)
  assert.equal(context.month, '一月')
})

test('group labels translate built-in names without changing user-created label names', async () => {
  const module = await import('../src/utils/ChoreGroupLabels.js').catch(
    () => ({}),
  )
  assert.equal(typeof module.getChoreGroupLabel, 'function')
  const t = i18n.t.bind(i18n)
  assert.equal(module.getChoreGroupLabel('Overdue', 'default', t), '已逾期')
  assert.equal(module.getChoreGroupLabel('Overdue', 'labels', t), 'Overdue')
  assert.equal(
    module.getChoreGroupLabel('Priority 1', 'priority', t),
    '优先级 1',
  )
})

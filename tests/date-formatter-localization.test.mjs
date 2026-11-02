import assert from 'node:assert/strict'
import test from 'node:test'
import moment from 'moment'
import 'moment/locale/zh-cn.js'

import { createDateFormatter } from '../src/utils/DateFormatter.js'

for (const locale of ['en', 'zh-cn']) {
  test(`creating a date formatter preserves ${locale} relative dates and week start`, () => {
    const previousLocale = moment.locale()
    moment.locale(locale)
    const previousWeekStart = moment.localeData().firstDayOfWeek()
    const previousYearStart = moment.localeData().firstDayOfYear()
    try {
      const date = moment().subtract(2, 'days')
      const expectedRelativeDate = date.fromNow()
      const formatter = createDateFormatter('YYYY-MM-DD', 'HH:mm', 1)

      assert.equal(moment.locale(), locale)
      assert.equal(formatter.formatRelative(date), expectedRelativeDate)
      assert.equal(moment.localeData().firstDayOfWeek(), 1)
      assert.equal(moment.localeData().firstDayOfYear(), previousYearStart)
    } finally {
      moment.updateLocale(locale, { week: { dow: previousWeekStart } })
      moment.locale(previousLocale)
    }
  })
}

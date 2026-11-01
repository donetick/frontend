import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectTimezone, withDefaultTimezone } from '../src/utils/timezone.js'

const detected = detectTimezone()

test('withDefaultTimezone prefers the profile timezone', () => {
  assert.deepEqual(withDefaultTimezone({ time: '' }, 'Asia/Singapore'), {
    time: '',
    timezone: 'Asia/Singapore',
  })
  assert.deepEqual(withDefaultTimezone({}, 'US/Eastern'), {
    timezone: 'America/New_York',
  })
})

test('withDefaultTimezone falls back to the device timezone', () => {
  for (const profileTimezone of [undefined, '', 'Not/AZone']) {
    assert.deepEqual(withDefaultTimezone({ timezone: '' }, profileTimezone), {
      timezone: detected,
    })
  }
  assert.deepEqual(withDefaultTimezone(undefined), { timezone: detected })
})

test('withDefaultTimezone keeps an existing timezone', () => {
  const metadata = { timezone: 'Europe/Berlin' }
  assert.equal(withDefaultTimezone(metadata, 'Asia/Singapore'), metadata)
})

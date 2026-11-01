import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectTimezone, withDetectedTimezone } from '../src/utils/timezone.js'

const detected = detectTimezone()

test('withDetectedTimezone fills a missing timezone', () => {
  assert.deepEqual(withDetectedTimezone({ unit: null, time: '' }), {
    unit: null,
    time: '',
    timezone: detected,
  })
  assert.deepEqual(withDetectedTimezone({ timezone: '' }), {
    timezone: detected,
  })
  assert.deepEqual(withDetectedTimezone(undefined), { timezone: detected })
})

test('withDetectedTimezone keeps an existing timezone', () => {
  const metadata = { timezone: 'Asia/Singapore' }
  assert.equal(withDetectedTimezone(metadata), metadata)
})

import assert from 'node:assert/strict'
import { test } from 'node:test'

import { detectTimezone, withDefaultTimezone } from '../src/utils/timezone.js'

const detected = detectTimezone()
const profile = timezone => async () => timezone

test('withDefaultTimezone prefers the profile timezone', async () => {
  assert.deepEqual(
    await withDefaultTimezone({ time: '' }, profile('Asia/Singapore')),
    { time: '', timezone: 'Asia/Singapore' },
  )
  assert.deepEqual(await withDefaultTimezone({}, profile('US/Eastern')), {
    timezone: 'America/New_York',
  })
})

test('withDefaultTimezone falls back to the device timezone', async () => {
  for (const getProfileTimezone of [
    profile(undefined),
    profile('Not/AZone'),
    async () => {
      throw new Error('offline')
    },
    undefined,
  ]) {
    assert.deepEqual(
      await withDefaultTimezone({ timezone: '' }, getProfileTimezone),
      { timezone: detected },
    )
  }
})

test('withDefaultTimezone keeps an existing timezone without a lookup', async () => {
  const metadata = { timezone: 'Europe/Berlin' }
  let called = false
  const result = await withDefaultTimezone(metadata, async () => {
    called = true
  })
  assert.equal(result, metadata)
  assert.equal(called, false)
})

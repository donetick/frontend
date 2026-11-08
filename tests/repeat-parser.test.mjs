import assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseRepeatV2 } from '../src/views/components/CustomParsers.js'

for (const phrase of [
  'biweekly',
  'bi-weekly',
  'every other week',
  'every 2 weeks',
]) {
  test(`quick add schedules "${phrase}" every two weeks`, () => {
    const input = `Water Plants ${phrase}`
    const parsed = parseRepeatV2(input)

    assert.equal(parsed.result.frequencyType, 'interval')
    assert.equal(parsed.result.frequency, 2)
    assert.equal(parsed.result.frequencyMetadata.unit, 'weeks')
    assert.equal(parsed.cleanedSentence, 'Water Plants')
    assert.equal(parsed.highlight.length, 1)
    const [highlight] = parsed.highlight
    assert.equal(input.slice(highlight.start, highlight.end), phrase)
  })
}

for (const phrase of ['weekly', 'every week']) {
  test(`quick add keeps "${phrase}" on a one-week interval`, () => {
    const parsed = parseRepeatV2(`Water Plants ${phrase}`)

    assert.equal(parsed.result.frequencyType, 'interval')
    assert.equal(parsed.result.frequency, 1)
    assert.equal(parsed.result.frequencyMetadata.unit, 'weeks')
    assert.equal(parsed.cleanedSentence, 'Water Plants')
  })
}

for (const phrase of ['BIWEEKLY', 'Bi-Weekly', 'Every Other Week']) {
  test(`quick add recognizes the two-week cadence in "${phrase}"`, () => {
    const input = `Water Plants ${phrase}`
    const parsed = parseRepeatV2(input)

    assert.equal(parsed.result.frequencyType, 'interval')
    assert.equal(parsed.result.frequency, 2)
    assert.equal(parsed.result.frequencyMetadata.unit, 'weeks')
    const [highlight] = parsed.highlight
    assert.equal(input.slice(highlight.start, highlight.end), phrase)
  })
}

for (const input of ['biweekly Water Plants', 'Water Plants (biweekly)']) {
  test(`quick add recognizes a complete biweekly token in "${input}"`, () => {
    const parsed = parseRepeatV2(input)

    assert.equal(parsed.result.frequencyType, 'interval')
    assert.equal(parsed.result.frequency, 2)
    assert.equal(parsed.result.frequencyMetadata.unit, 'weeks')
    const [highlight] = parsed.highlight
    assert.equal(input.slice(highlight.start, highlight.end), 'biweekly')
  })
}

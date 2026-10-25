import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

const source = Buffer.concat([
  Buffer.from(';'),
  readFileSync(
    new URL('../src/views/Settings/LocalizationSettings.jsx', import.meta.url),
  ),
])
const ast = parseSync(source.toString(), { syntax: 'ecmascript', jsx: true })
const find = (node, predicate) => {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of Object.values(node)) {
    for (const item of Array.isArray(child) ? child : [child]) {
      const result = find(item, predicate)
      if (result) return result
    }
  }
}
const attribute = (element, name) =>
  element.opening.attributes.find(item => item.name?.value === name)
const callback = (component, name, context) => {
  const element = find(
    ast,
    node =>
      node.type === 'JSXElement' &&
      node.opening.name.value === component &&
      (!name || attribute(node, 'name')?.value?.value === name),
  )
  assert.ok(element)
  const handler = attribute(element, 'onChange').value.expression
  return vm.runInNewContext(
    `(${source.subarray(handler.span.start - ast.span.start, handler.span.end - ast.span.start).toString()})`,
    context,
  )
}

test('language changes preserve analytics and ignore empty selections', () => {
  const calls = []
  const change = callback('Select', null, {
    setLanguage: value => calls.push(['language', value]),
    track: (event, properties) =>
      calls.push([event, JSON.parse(JSON.stringify(properties))]),
  })
  change(null, null)
  assert.deepEqual(calls, [])
  change(null, 'he')
  assert.deepEqual(calls, [
    ['language', 'he'],
    ['localization_setting_changed', { setting: 'language', value: 'he' }],
  ])
})

test('date and time radios save the format string and existing analytics values', () => {
  for (const [group, setter, setting, value] of [
    ['date-format', 'setDateFormat', 'date_format', 'YYYY-MM-DD'],
    ['time-format', 'setTimeFormat', 'time_format', 'HH:mm'],
  ]) {
    const calls = []
    const change = callback('RadioGroup', group, {
      [setter]: next => calls.push(['saved', next]),
      track: (event, properties) =>
        calls.push([event, JSON.parse(JSON.stringify(properties))]),
    })
    change({ target: { value } })
    assert.deepEqual(calls, [
      ['saved', value],
      ['localization_setting_changed', { setting, value }],
    ])
  }
})

test('week-start radios persist numbers and retain named analytics values', () => {
  for (const [value, name] of [
    [0, 'sunday'],
    [1, 'monday'],
    [6, 'saturday'],
  ]) {
    const calls = []
    const change = callback('RadioGroup', 'week-start', {
      weekStarts: [
        { value: 0, name: 'sunday' },
        { value: 1, name: 'monday' },
        { value: 6, name: 'saturday' },
      ],
      setFirstDayOfWeek: next => calls.push(['saved', next]),
      track: (event, properties) =>
        calls.push([event, JSON.parse(JSON.stringify(properties))]),
    })
    change({ target: { value: String(value) } })
    assert.deepEqual(calls, [
      ['saved', value],
      [
        'localization_setting_changed',
        { setting: 'first_day_of_week', value: name },
      ],
    ])
  }
})

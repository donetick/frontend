import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

// Exercise the real editor callbacks without mounting the entire application.
function sourceFile(name) {
  const source = readFileSync(new URL(`../src/${name}`, import.meta.url))
  // Anchor the module span before any leading comments.
  const anchoredSource = Buffer.concat([Buffer.from(';'), source])
  const ast = parseSync(anchoredSource.toString(), {
    syntax: 'ecmascript',
    jsx: true,
  })
  return {
    ast,
    text: node =>
      anchoredSource
        .subarray(
          node.span.start - ast.span.start,
          node.span.end - ast.span.start,
        )
        .toString(),
  }
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of Object.values(node)) {
    if (Array.isArray(child)) {
      for (const item of child) {
        const result = find(item, predicate)
        if (result) return result
      }
    } else {
      const result = find(child, predicate)
      if (result) return result
    }
  }
}
const attribute = (element, name) =>
  element.opening.attributes.find(item => item.name?.value === name)
const evaluate = (file, node, context) =>
  vm.runInNewContext(`(${file.text(node)})`, context)
const editor = sourceFile('views/ChoreEdit/ChoreEdit.jsx')
test('editor updates live reminder templates without losing other notification metadata', () => {
  const template = find(
    editor.ast,
    node =>
      node.type === 'JSXElement' &&
      node.opening.name.value === 'NotificationTemplate',
  )
  assert.ok(template, 'live reminder editor exists')
  assert.equal(
    attribute(template, 'minNotifications').value.expression.value,
    0,
  )
  const callback = attribute(template, 'onChange').value.expression
  const context = {
    notificationMetadata: {
      templates: [{ value: 0, unit: 'm' }],
      circleGroup: true,
      circleGroupID: -123,
    },
    setNotificationMetadata: value => {
      context.updated = value
    },
  }
  const update = evaluate(editor, callback, context)
  const templates = [{ value: -1, unit: 'd' }]
  update({ notifications: templates })
  assert.equal(context.updated.templates, templates)
  assert.equal(context.updated.circleGroup, true)
  assert.equal(context.updated.circleGroupID, -123)
  context.updated = undefined
  update({ notifications: context.notificationMetadata.templates })
  assert.equal(
    context.updated,
    undefined,
    'unchanged templates do not cause a render loop',
  )
  update({ notifications: [] })
  assert.equal(
    context.updated.templates.length,
    0,
    'reminders can be disabled by removing all templates',
  )
})

test('schedule mode keeps Plus gating for Thing triggers and clears triggers for ordinary schedules', () => {
  const repeat = sourceFile('views/ChoreEdit/RepeatSection.jsx')
  const modeSelect = find(
    repeat.ast,
    node =>
      node.type === 'JSXElement' &&
      node.opening.name.value === 'Select' &&
      attribute(node, 'aria-label')?.value?.expression?.arguments?.[0]
        ?.expression?.value === 'repeat.picker.scheduleType',
  )
  const modeCallback = attribute(modeSelect, 'onChange').value.expression
  for (const plus of [false, true]) {
    const context = {
      userProfile: { plus },
      isPlusAccount: profile => profile.plus,
      PAYWALL_REASON: { THING_TRIGGERS: 'thing-triggers' },
      showPaywall: reason => {
        context.paywall = reason
      },
      onFrequencyTypeUpdate: value => {
        context.frequency = value
      },
      onTriggerUpdate: value => {
        context.trigger = value
      },
    }
    evaluate(repeat, modeCallback, context)(null, 'trigger')
    if (plus) assert.equal(context.frequency, 'trigger')
    else {
      assert.equal(context.paywall, 'thing-triggers')
      assert.equal(context.frequency, undefined)
    }
    evaluate(repeat, modeCallback, context)(null, 'once')
    assert.equal(context.frequency, 'once')
    assert.equal(context.trigger, null)
  }
})

test('Thing triggers accept numeric zero and reject missing trigger values', () => {
  const trigger = sourceFile('views/ChoreEdit/ThingTriggerSection.jsx')
  const effect = find(
    trigger.ast,
    node =>
      node.type === 'CallExpression' &&
      node.callee.value === 'useEffect' &&
      trigger.text(node.arguments[0].expression).includes('onTriggerUpdate'),
  )
  const context = {
    selectedThing: { id: 1, type: 'number' },
    condition: 'eq',
    triggerState: 0,
    onTriggerUpdate: value => {
      context.updated = value
    },
    onValidate: value => {
      context.valid = value
    },
  }
  const validator = find(
    trigger.ast,
    node =>
      node.type === 'VariableDeclarator' && node.id.value === 'isValidTrigger',
  )
  const hasValue = find(
    trigger.ast,
    node => node.type === 'VariableDeclarator' && node.id.value === 'hasValue',
  )
  context.hasValue = evaluate(trigger, hasValue.init, context)
  context.isValidTrigger = evaluate(trigger, validator.init, context)
  evaluate(trigger, effect.arguments[0].expression, context)()
  assert.equal(context.updated.triggerState, 0)
  assert.equal(context.valid, true)
  context.triggerState = null
  context.updated = undefined
  evaluate(trigger, effect.arguments[0].expression, context)()
  assert.equal(context.updated, undefined)
  assert.equal(context.valid, false)
})

test('live reminder editor gates advanced reminders while due reminders stay available without Plus', () => {
  const file = sourceFile('components/NotificationTemplate.jsx')
  const variable = name =>
    find(
      file.ast,
      node => node.type === 'VariableDeclarator' && node.id.value === name,
    )
  for (const isPlus of [false, true]) {
    const context = {
      isPlus,
      PAYWALL_REASON: { ADVANCED_REMINDERS: 'advanced-reminders' },
      showPaywall: reason => {
        context.paywall = reason
      },
      maxNotifications: 5,
      notificationsRef: { current: [] },
      commitNotifications: value => {
        context.committed = value
      },
    }
    context.isDuplicate = evaluate(file, variable('isDuplicate').init, context)
    context.requirePlus = evaluate(
      file,
      variable('requirePlus').init.arguments[0].expression,
      context,
    )
    context.getSmartSuggestion = evaluate(
      file,
      variable('getSmartSuggestion').init,
      context,
    )
    const add = evaluate(file, variable('addSmartNotification').init, context)
    add('before')
    if (isPlus) {
      assert.equal(context.committed[0].value, -1)
      assert.equal(context.committed[0].unit, 'd')
      assert.equal(context.paywall, undefined)
    } else {
      assert.equal(context.paywall, 'advanced-reminders')
      assert.equal(context.committed, undefined)
    }
    context.paywall = undefined
    context.committed = undefined
    add('due')
    assert.equal(context.committed[0].value, 0)
    assert.equal(context.committed[0].unit, 'm')
    assert.equal(context.paywall, undefined)
  }
})

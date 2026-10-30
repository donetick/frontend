import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import console from 'node:console'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'
import vm from 'node:vm'

import { parseSync } from '@swc/core'

import { sanitizeRemindersForPlan } from '../src/utils/entitlements.js'

// Exercise the real editor callbacks without mounting the entire application.
function sourceFile(name) {
  const source = readFileSync(
    new URL(`../src/views/ChoreEdit/${name}`, import.meta.url),
  )
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
const editor = sourceFile('ChoreEdit.jsx')
const reminderEditor = find(
  editor.ast,
  node =>
    node.type === 'JSXElement' &&
    node.opening.name.value === 'NotificationTemplate',
)
assert.ok(reminderEditor)
assert.equal(
  attribute(reminderEditor, 'minNotifications').value.expression.value,
  0,
)
const editorContext = {
  notificationMetadata: {
    templates: [{ value: 0, unit: 'm' }],
    retained: true,
  },
  setNotificationMetadata: value => {
    editorContext.updated = value
  },
}
const updateReminders = evaluate(
  editor,
  attribute(reminderEditor, 'onChange').value.expression,
  editorContext,
)
updateReminders({ notifications: editorContext.notificationMetadata.templates })
assert.equal(editorContext.updated, undefined)
updateReminders({ notifications: [] })
assert.deepEqual(JSON.parse(JSON.stringify(editorContext.updated)), {
  templates: [],
  retained: true,
})

// The old group-channel checkbox is commented out. Exercise the active reminder
// editor's actual callbacks and entitlement sanitizer instead of that dead UI.
const reminders = sourceFile('../../components/NotificationTemplate.jsx')
const variable = name => {
  const declaration = find(
    reminders.ast,
    node => node.type === 'VariableDeclarator' && node.id.value === name,
  )
  assert.ok(declaration, `active reminder editor defines ${name}`)
  return declaration.init
}
const reminderFixture = (isPlus, initial = []) => {
  const context = {
    isPlus,
    isPlanKnown: true,
    maxNotifications: 5,
    notifications: initial,
    notificationsRef: { current: initial },
    sanitizeRemindersForPlan,
    PAYWALL_REASON: { ADVANCED_REMINDERS: 'advanced-reminders' },
    t: key => key,
    showPaywall: reason => {
      context.paywall = reason
    },
    setNotifications: value => {
      context.notifications =
        typeof value === 'function' ? value(context.notifications) : value
    },
    setError: value => {
      context.error = value
    },
    setShowSaveDefault: value => {
      context.showSaveDefault = value
    },
    setDraftValues: update => {
      context.drafts = update(context.drafts || {})
    },
  }
  context.requirePlus = evaluate(
    reminders,
    variable('requirePlus').arguments[0].expression,
    context,
  )
  for (const name of [
    'commitNotifications',
    'isDuplicate',
    'getSmartSuggestion',
    'addSmartNotification',
    'removeNotification',
  ]) {
    context[name] = evaluate(reminders, variable(name), context)
  }
  return context
}
for (const plus of [false, true]) {
  for (const [kind, value] of [
    ['reminder', -1],
    ['followup', 1],
  ]) {
    const context = reminderFixture(plus)
    context.addSmartNotification(kind)
    if (plus) {
      assert.equal(context.notificationsRef.current[0].value, value)
      assert.equal(context.notificationsRef.current[0].unit, 'd')
      assert.equal(context.paywall, undefined)
    } else {
      assert.equal(context.paywall, 'advanced-reminders')
      assert.equal(context.notificationsRef.current.length, 0)
    }
  }
  const context = reminderFixture(plus)
  context.addSmartNotification('due')
  assert.equal(context.notificationsRef.current.length, 1)
  assert.equal(context.notificationsRef.current[0].value, 0)
  assert.equal(context.paywall, undefined)
  context.addSmartNotification('due')
  assert.equal(context.notificationsRef.current.length, 1)
  assert.equal(context.error, 'notificationTemplate.errOneDue')
}
const expired = reminderFixture(false, [{ value: -1, unit: 'd' }])
expired.removeNotification(0)
assert.equal(expired.notificationsRef.current.length, 0)
assert.equal(expired.paywall, undefined)

const sanitizeEffect = find(
  reminders.ast,
  node =>
    node.type === 'CallExpression' &&
    node.callee.value === 'useEffect' &&
    reminders
      .text(node.arguments[0].expression)
      .includes('sanitizeRemindersForPlan'),
)
assert.ok(sanitizeEffect)
for (const plus of [false, true]) {
  const initial = [
    { value: -1, unit: 'd' },
    { value: 0, unit: 'm' },
  ]
  const context = reminderFixture(plus, initial)
  context.isPlanKnown = false
  const sanitize = evaluate(
    reminders,
    sanitizeEffect.arguments[0].expression,
    context,
  )
  sanitize()
  assert.equal(context.notifications, initial)
  context.isPlanKnown = true
  sanitize()
  assert.deepEqual(
    JSON.parse(JSON.stringify(context.notifications)),
    plus ? initial : [{ value: 0, unit: 'm' }],
  )
}

const repeat = sourceFile('RepeatSection.jsx')
const modeSelect = find(
  repeat.ast,
  node =>
    node.type === 'JSXElement' &&
    node.opening.name.value === 'Select' &&
    attribute(node, 'aria-label')?.value?.expression?.arguments?.[0]?.expression
      ?.value === 'repeat.picker.scheduleType',
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

const trigger = sourceFile('ThingTriggerSection.jsx')
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
  hasValue: value => value !== null && value !== undefined && value !== '',
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
context.isValidTrigger = evaluate(trigger, validator.init, context)
evaluate(trigger, effect.arguments[0].expression, context)()
assert.equal(context.updated.triggerState, 0)
assert.equal(context.valid, true)
context.triggerState = null
context.updated = undefined
evaluate(trigger, effect.arguments[0].expression, context)()
assert.equal(context.updated, undefined)
assert.equal(context.valid, false)
console.log(
  'Editor preserves upstream Plus gating and zero-valued Thing triggers',
)

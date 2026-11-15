import assert from 'node:assert/strict'
import test from 'node:test'

const store = new Map()
globalThis.localStorage = {
  getItem: key => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
}

const { getDefaultIsRolling, setDefaultIsRolling } =
  await import('../src/utils/TaskDefaults.js')

test('new tasks reschedule from the due date when no default is saved', () => {
  store.clear()
  assert.equal(getDefaultIsRolling(), false)
})

test('the saved reschedule default is returned for new tasks', () => {
  store.clear()
  setDefaultIsRolling(true)
  assert.equal(store.get('defaultRollingSetting'), 'true')
  assert.equal(getDefaultIsRolling(), true)

  setDefaultIsRolling(false)
  assert.equal(getDefaultIsRolling(), false)
})

test('a corrupt saved default falls back to rescheduling from the due date', () => {
  store.clear()
  store.set('defaultRollingSetting', '{not json')
  assert.equal(getDefaultIsRolling(), false)

  store.set('defaultRollingSetting', '"true"')
  assert.equal(getDefaultIsRolling(), false)
})

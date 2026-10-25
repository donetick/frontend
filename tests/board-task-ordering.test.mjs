import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyTaskOrder,
  getTaskDropOrder,
} from '../src/views/Projects/projectLayout/boardTaskOrdering.js'

const createGroups = () => ({
  10: [{ id: 1 }, { id: 2 }],
  20: [{ id: 3 }, { id: 4 }],
  30: [],
})
const ids = tasks => tasks.map(task => String(task.id))

test('cross-section preview makes room before the hovered task', () => {
  const original = createGroups()
  const order = getTaskDropOrder(original, '1', 20, '4')
  const preview = applyTaskOrder(original, order)
  assert.deepEqual(ids(preview[10]), ['2'])
  assert.deepEqual(ids(preview[20]), ['3', '1', '4'])
  assert.equal(preview[20][1], original[10][0])
  assert.equal(preview[30], original[30])
  assert.deepEqual(ids(original[10]), ['1', '2'])
  assert.deepEqual(ids(original[20]), ['3', '4'])
})

test('preview supports insertion below the hovered task', () => {
  const original = createGroups()
  const order = getTaskDropOrder(original, '1', 20, '4', true)
  assert.deepEqual(order.orderedIds, ['3', '4', '1'])
})

test('empty sections accept a live preview', () => {
  const original = createGroups()
  const preview = applyTaskOrder(original, getTaskDropOrder(original, '1', 30))
  assert.deepEqual(ids(preview[30]), ['1'])
  assert.deepEqual(ids(preview[10]), ['2'])
})

test('dropping over the moved task itself retains the preview order', () => {
  const original = createGroups()
  const order = getTaskDropOrder(original, '1', 20, '4')
  const preview = applyTaskOrder(original, order)
  const finalOrder = getTaskDropOrder(preview, '1', 20, '1')
  assert.deepEqual(finalOrder, order)
})

test('same-section sorting continues after crossing sections', () => {
  const original = createGroups()
  const preview = applyTaskOrder(
    original,
    getTaskDropOrder(original, '1', 20, '4'),
  )
  const finalOrder = getTaskDropOrder(preview, '1', 20, '3')
  assert.deepEqual(finalOrder.orderedIds, ['1', '3', '4'])
})

test('moving back to the original section never duplicates the task', () => {
  const original = createGroups()
  const preview = applyTaskOrder(
    original,
    getTaskDropOrder(original, '1', 20, '4'),
  )
  const backOrder = getTaskDropOrder(preview, '1', 10, '2')
  // Each preview is applied to the unchanged base order, allowing cancellation
  // to restore it simply by clearing the preview.
  const restored = applyTaskOrder(original, backOrder)
  assert.deepEqual(restored, original)
  assert.equal(Object.values(restored).flat().length, 4)
  assert.equal(applyTaskOrder(original, null), original)
})

test('same-section drops onto the section append the task', () => {
  const order = getTaskDropOrder(createGroups(), '1', 10)
  assert.deepEqual(order.orderedIds, ['2', '1'])
})

test('invalid or missing drag targets leave the original order intact', () => {
  const original = createGroups()
  assert.equal(getTaskDropOrder(original, 'missing', 20, '4'), null)
  assert.equal(getTaskDropOrder(original, '1', 999), null)
  assert.equal(applyTaskOrder(original, { sectionId: 999 }), original)
  assert.equal(
    applyTaskOrder(original, { sectionId: 20, taskId: 'missing' }),
    original,
  )
})

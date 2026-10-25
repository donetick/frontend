import assert from 'node:assert/strict'
import test from 'node:test'

import { closestCorners } from '@dnd-kit/core'

import { boardCollisionDetection } from '../src/views/Projects/projectLayout/boardCollisionDetection.js'

const rect = (left, top, width = 280, height = 60) => ({
  left,
  top,
  width,
  height,
  right: left + width,
  bottom: top + height,
})
const container = (id, type, sectionId) => ({
  id,
  data: { current: { type, sectionId } },
})
const sections = [
  container('section:1', 'section', 1),
  container('section:2', 'section', 2),
]
const tasks = [container('task:1', 'task', 1), container('task:2', 'task', 2)]
const makeArgs = (overrides = {}) => ({
  active: { data: { current: { type: 'task' } } },
  pointerCoordinates: { x: 330, y: 80 },
  // The cursor is over section 2, but the dragged card's rectangle is closer
  // to task 1. It must not steal the target from the pointer's section.
  collisionRect: rect(100, 50),
  droppableContainers: [...sections, ...tasks],
  droppableRects: new Map([
    ['section:1', rect(0, 0, 280, 400)],
    ['section:2', rect(300, 0, 280, 400)],
    ['task:1', rect(0, 50)],
    ['task:2', rect(300, 50)],
  ]),
  ...overrides,
})

test('only ranks tasks in the section under the pointer', () => {
  assert.deepEqual(
    boardCollisionDetection(makeArgs()).map(item => item.id),
    ['task:2'],
  )
})

test('an empty section remains a drop target', () => {
  const args = makeArgs({ droppableContainers: [...sections, tasks[0]] })
  assert.equal(boardCollisionDetection(args)[0].id, 'section:2')
})

test('pointer movement back to the source section updates the target', () => {
  const args = makeArgs({ pointerCoordinates: { x: 40, y: 80 } })
  assert.equal(boardCollisionDetection(args)[0].id, 'task:1')
})

test('section dragging never targets a task', () => {
  const args = makeArgs({
    active: { data: { current: { type: 'section' } } },
  })
  assert.deepEqual(
    boardCollisionDetection(args).map(item => item.id),
    closestCorners({ ...args, droppableContainers: sections }).map(
      item => item.id,
    ),
  )
})

test('keyboard dragging retains spatial collision detection', () => {
  const args = makeArgs({ pointerCoordinates: null })
  assert.deepEqual(boardCollisionDetection(args), closestCorners(args))
})

test('gaps between sections fall back to the nearest section', () => {
  const args = makeArgs({ pointerCoordinates: { x: 290, y: 80 } })
  const nearest = closestCorners({ ...args, droppableContainers: sections })[0]
  const sectionId = nearest.data.droppableContainer.data.current.sectionId
  assert.equal(
    boardCollisionDetection(args)[0].data.droppableContainer.data.current
      .sectionId,
    sectionId,
  )
})

test('no mounted sections returns no target', () => {
  assert.deepEqual(
    boardCollisionDetection(makeArgs({ droppableContainers: [] })),
    [],
  )
})

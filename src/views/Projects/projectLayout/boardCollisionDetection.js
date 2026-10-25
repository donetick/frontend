import { closestCorners, pointerWithin } from '@dnd-kit/core'

// Only rank tasks in the section under the pointer, rather than sorting every
// task on the board on every mouse move. Section dragging and keyboard dragging
// retain their spatial collision behaviour (keyboard events have no pointer).
export const boardCollisionDetection = args => {
  const sections = args.droppableContainers.filter(
    container => container.data.current?.type === 'section',
  )
  const sectionArgs = { ...args, droppableContainers: sections }
  if (args.active.data.current?.type === 'section') {
    return closestCorners(sectionArgs)
  }
  if (!args.pointerCoordinates) return closestCorners(args)

  const sectionCollision =
    pointerWithin(sectionArgs)[0] || closestCorners(sectionArgs)[0]
  if (!sectionCollision) return []

  const section = sections.find(item => item.id === sectionCollision.id)
  const tasks = args.droppableContainers.filter(
    container =>
      container.data.current?.type === 'task' &&
      container.data.current.sectionId === section.data.current.sectionId,
  )
  if (!tasks.length) return [sectionCollision]

  const collisions = closestCorners({ ...args, droppableContainers: tasks })
  return collisions.length ? collisions : [sectionCollision]
}

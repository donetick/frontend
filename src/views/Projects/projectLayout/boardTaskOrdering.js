import { arrayMove } from '@dnd-kit/sortable'

// Preserve task objects and unaffected section arrays so drag previews don't
// invalidate every card's memoization. Never mutate the server-backed order.
export const applyTaskOrder = (grouped, order) => {
  if (!order || !grouped[order.sectionId]) return grouped
  const task = Object.values(grouped)
    .flat()
    .find(item => String(item.id) === order.taskId)
  if (!task) return grouped

  const next = { ...grouped }
  Object.entries(next).forEach(([id, tasks]) => {
    if (tasks.some(item => String(item.id) === order.taskId)) {
      next[id] = tasks.filter(item => String(item.id) !== order.taskId)
    }
  })
  const target = new Map(
    next[order.sectionId].map(item => [String(item.id), item]),
  )
  target.set(order.taskId, task)
  next[order.sectionId] = order.orderedIds
    .flatMap(id => {
      const item = target.get(id)
      target.delete(id)
      return item ? [item] : []
    })
    .concat([...target.values()])
  return next
}

export const getTaskDropOrder = (
  grouped,
  taskId,
  sectionId,
  overTaskId,
  insertAfter = false,
) => {
  const sourceId = Object.keys(grouped).find(id =>
    grouped[id].some(item => String(item.id) === taskId),
  )
  if (sourceId === undefined || !grouped[sectionId]) return null

  const targetIds = grouped[sectionId].map(item => String(item.id))
  let orderedIds
  if (sourceId === String(sectionId)) {
    const oldIndex = targetIds.indexOf(taskId)
    const overIndex = overTaskId ? targetIds.indexOf(overTaskId) : -1
    orderedIds = arrayMove(
      targetIds,
      oldIndex,
      overIndex < 0 ? targetIds.length - 1 : overIndex,
    )
  } else {
    orderedIds = targetIds.filter(id => id !== taskId)
    const overIndex = overTaskId ? orderedIds.indexOf(overTaskId) : -1
    orderedIds.splice(
      overIndex < 0 ? orderedIds.length : overIndex + Number(insertAfter),
      0,
      taskId,
    )
  }
  return { taskId, sectionId, orderedIds }
}

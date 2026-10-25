// IDs from drag-and-drop are strings; persisted/server IDs may be numbers.
const sameId = (a, b) => String(a) === String(b)

// The server chooses the authoritative position under the project's lock.
// Mirror append behavior locally so new/queued tasks never flash at the top.
export const appendChoreToSection = (task, chores) => {
  if (!task.projectId || task.projectId === 'default') return task
  const siblings = chores.filter(
    chore =>
      sameId(chore.projectId, task.projectId) &&
      (task.sectionId == null ||
        chore.sectionId == null ||
        sameId(chore.sectionId, task.sectionId)),
  )
  return {
    ...task,
    boardPosition:
      Math.max(0, ...siblings.map(chore => chore.boardPosition || 0)) + 1000,
  }
}

export const reorderedAfter = (sections, sectionId, afterSectionId) => {
  const next = [...sections]
  const fromIndex = next.findIndex(section => sameId(section.id, sectionId))
  if (fromIndex === -1) return sections
  const [moved] = next.splice(fromIndex, 1)
  const afterIndex =
    afterSectionId == null
      ? -1
      : next.findIndex(section => sameId(section.id, afterSectionId))
  next.splice(afterIndex + 1, 0, moved)
  return next
}

export const reorderedChoresAfter = (
  chores,
  choreId,
  sectionId,
  afterChoreId,
) => {
  const moved = chores.find(chore => sameId(chore.id, choreId))
  if (!moved) return chores
  const siblings = chores
    .filter(
      chore =>
        sameId(chore.projectId, moved.projectId) &&
        sameId(chore.sectionId, sectionId) &&
        !sameId(chore.id, choreId),
    )
    .sort((a, b) => (a.boardPosition || 0) - (b.boardPosition || 0))
  const afterIndex =
    afterChoreId == null
      ? -1
      : siblings.findIndex(chore => sameId(chore.id, afterChoreId))
  siblings.splice(afterIndex + 1, 0, moved)
  const positions = new Map(
    siblings.map((chore, index) => [String(chore.id), index]),
  )
  return chores.map(chore =>
    positions.has(String(chore.id))
      ? { ...chore, sectionId, boardPosition: positions.get(String(chore.id)) }
      : chore,
  )
}

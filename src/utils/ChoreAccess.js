// Mirrors ModifyHistory authorization in dt-core/internal/chore/handler.go.
// Task ownership alone does not grant permission to edit a history entry.
export const canEditChoreHistory = (
  history,
  userId,
  circleMembers = [],
  circleId,
) => {
  if (!history || !userId) return false
  if (history.completedBy === userId || history.assignedTo === userId)
    return true
  if (!circleId) return false
  const member = circleMembers.find(
    member => member.userId === userId && member.circleId === circleId,
  )
  return member?.role === 'admin' || member?.role === 'manager'
}

// Mirrors Chore.CanDeleteHistory. Unlike editing, task creators can delete,
// an unassigned entry can be deleted by any viewer, and managers get no override.
export const canDeleteChoreHistory = (
  chore,
  history,
  userId,
  circleMembers = [],
) => {
  if (!chore || !history || !userId) return false
  if (
    chore.createdBy === userId ||
    history.completedBy === userId ||
    history.assignedTo == null ||
    history.assignedTo === userId
  )
    return true
  return circleMembers.some(
    member =>
      member.userId === userId &&
      member.circleId === chore.circleId &&
      member.role === 'admin',
  )
}

// Mirrors the authorization portion of Chore.CanEdit in dt-core.
// Visibility/assignment does not grant edit permission; managers are not admins.
// Stale updatedAt/conflict validation remains the backend's responsibility.
export const canEditChore = (chore, userId, circleMembers = []) => {
  if (!chore || !userId) return false
  if (chore.createdBy === userId) return true
  return circleMembers.some(
    member =>
      member.userId === userId &&
      member.role === 'admin' &&
      member.circleId === chore.circleId,
  )
}

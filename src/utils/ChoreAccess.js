import { getProjectAudienceIds, isRestrictedProject } from './ProjectAccess.js'

// Mirrors dt-core's CanComplete, CanEdit, CanDelegate and reviewer rules.
export const getChorePermissions = (chore, userId, members = []) => {
  const member = members.find(
    m => m.userId === userId && m.circleId === chore?.circleId,
  )
  const owner = Boolean(userId && chore?.createdBy === userId)
  const admin = member?.role === 'admin'
  const reviewer = admin || member?.role === 'manager'
  const project =
    !chore?.projectId || chore.projectId === chore?.project?.id
      ? chore?.project
      : null
  const restricted = project && isRestrictedProject(project)
  const canViewProject =
    !restricted || getProjectAudienceIds(project).includes(userId)
  const unassigned =
    chore?.assignStrategy === 'no_assignee' && !chore?.assignedTo
  const assigned =
    chore?.assignedTo === userId ||
    chore?.assignees?.some(a => a.userId === userId)
  const complete = Boolean(
    userId &&
    chore &&
    canViewProject &&
    (unassigned
      ? restricted || (chore.isPrivate ? owner : Boolean(member))
      : assigned || (chore.isPrivate ? owner : reviewer)),
  )
  return {
    complete,
    approve: Boolean(userId && reviewer && canViewProject),
    edit: Boolean(userId && (owner || admin) && canViewProject),
    archive: Boolean(owner && canViewProject),
    delegate: Boolean(member && member.isActive !== false && canViewProject),
    editTime: Boolean(
      userId &&
      canViewProject &&
      (owner || chore?.assignees?.some(a => a.userId === userId)),
    ),
  }
}

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

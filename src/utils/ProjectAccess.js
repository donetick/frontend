// Who can see a project (and every task in it).
//
// The server sends `visibility` ("private" | "members" | "circle") and, for
// "members", `memberIds`. Older servers only send `isPrivate`, which maps to
// "private" / "circle".
export const PROJECT_VISIBILITY = {
  PRIVATE: 'private',
  MEMBERS: 'members',
  CIRCLE: 'circle',
}

export const getProjectVisibility = project => {
  if (!project || project.id === 'default') return PROJECT_VISIBILITY.CIRCLE
  if (Object.values(PROJECT_VISIBILITY).includes(project.visibility)) {
    return project.visibility
  }
  return project.isPrivate
    ? PROJECT_VISIBILITY.PRIVATE
    : PROJECT_VISIBILITY.CIRCLE
}

export const isRestrictedProject = project =>
  getProjectVisibility(project) !== PROJECT_VISIBILITY.CIRCLE

// User IDs that can see a restricted project (owner first), or null when the
// whole circle can see it.
export const getProjectAudienceIds = project => {
  const visibility = getProjectVisibility(project)
  if (visibility === PROJECT_VISIBILITY.CIRCLE) return null
  const ids = [project.created_by]
  if (visibility === PROJECT_VISIBILITY.MEMBERS) {
    for (const id of project.memberIds || []) {
      if (!ids.includes(id)) ids.push(id)
    }
  }
  return ids
}

// Narrows a circle member list (objects with userId) to the people who can see
// the project. Assigning anybody else would be rejected by the server.
export const filterMembersForProject = (members, project) => {
  const ids = getProjectAudienceIds(project)
  if (!ids) return members || []
  return (members || []).filter(member => ids.includes(member.userId))
}

export const sameMemberSet = (a = [], b = []) => {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every(id => set.has(id))
}

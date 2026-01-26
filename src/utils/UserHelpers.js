// User type detection and permission utilities

export const USER_TYPES = {
  PARENT: 0,
  CHILD: 1,
}

export const isParentUser = (user) => {
  if (!user) return false
  return user.userType === USER_TYPES.PARENT && !user.parentUserId
}

export const isChildUser = (user) => {
  if (!user) return false
  return user.userType === USER_TYPES.CHILD && user.parentUserId !== null
}

export const canManageChildUsers = (user) => {
  return isParentUser(user)
}

export const canCreateChores = (user) => {
  // Both parent and child users can create chores
  return user && (isParentUser(user) || isChildUser(user))
}

export const canManageCircle = (user) => {
  // Only parent users can manage circle settings
  return isParentUser(user)
}

export const canAccessAdminSettings = (user) => {
  // Only parent users can access admin settings like API tokens, MFA, etc.
  return isParentUser(user)
}

export const getUserDisplayInfo = (user) => {
  if (!user) return { displayName: '', username: '', userType: 'unknown' }

  return {
    displayName: user.displayName || user.username,
    username: user.username,
    userType: isParentUser(user) ? 'parent' : isChildUser(user) ? 'child' : 'unknown',
    parentUserId: user.parentUserId,
    circleID: user.circleID,
  }
}

export const getChildUsernameFromCombined = (combinedUsername) => {
  // Extract child name from format: parent_child
  const parts = combinedUsername.split('_')
  if (parts.length >= 2) {
    return parts.slice(1).join('_') // In case child name contains underscores
  }
  return combinedUsername
}

export const getParentUsernameFromCombined = (combinedUsername) => {
  // Extract parent name from format: parent_child
  const parts = combinedUsername.split('_')
  return parts[0] || combinedUsername
}

export const buildChildUsername = (parentUsername, childName) => {
  return `${parentUsername}_${childName}`
}
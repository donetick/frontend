// Inactive members do not make an inbox shared. Missing data defaults to solo.
export const isSharedInbox = (members = []) =>
  members.filter(member => member && member.isActive !== false).length > 1

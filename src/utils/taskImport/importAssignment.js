export const IMPORT_ASSIGN_STRATEGIES = [
  'keep_last_assigned',
  'random',
  'least_completed',
  'round_robin',
]

// Assignment is account-specific import configuration, never portable content.
export function resolveImportAssignment(assignment, userId) {
  if (!assignment) {
    return {
      assignees: [{ userId }],
      assignedTo: userId,
      assignStrategy: 'keep_last_assigned',
    }
  }
  if (assignment.anyone) {
    return { assignees: [], assignedTo: null, assignStrategy: 'no_assignee' }
  }
  const userIds = [...new Set(assignment.userIds)]
  if (!userIds.length) throw new Error('Select at least one assignee.')
  if (!IMPORT_ASSIGN_STRATEGIES.includes(assignment.strategy))
    throw new Error('Unsupported assignment strategy.')
  const assignedTo = assignment.assignedTo ?? userIds[0]
  if (!userIds.includes(assignedTo))
    throw new Error('Initial assignee must be one of the selected assignees.')
  return {
    assignees: userIds.map(userId => ({ userId })),
    assignedTo,
    assignStrategy:
      userIds.length > 1 ? assignment.strategy : 'keep_last_assigned',
  }
}

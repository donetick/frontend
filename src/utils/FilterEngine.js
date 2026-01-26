/**
 * Filter Engine - Evaluates filter conditions against chores
 *
 * This engine takes saved filter conditions and applies them to chores.
 * It supports various operators and combines conditions with AND/OR logic.
 */

/**
 * Evaluate a single condition against a chore
 * @param {Object} chore - The chore to evaluate
 * @param {Object} condition - The condition to check
 * @param {Object} context - Additional context (userId, members, etc.)
 * @returns {boolean} - Whether the chore matches the condition
 */
export const evaluateCondition = (chore, condition, context = {}) => {
  const { type, operator, value } = condition

  switch (type) {
    case 'assignee':
      return evaluateAssignee(chore, operator, value, context)

    case 'createdBy':
      return evaluateCreatedBy(chore, operator, value, context)

    case 'priority':
      return evaluatePriority(chore, operator, value)

    case 'status':
      return evaluateStatus(chore, operator, value)

    case 'dueDate':
      return evaluateDueDate(chore, operator, value)

    case 'label':
      return evaluateLabel(chore, operator, value)

    case 'project':
      return evaluateProject(chore, operator, value)

    default:
      console.warn(`Unknown condition type: ${type}`)
      return true
  }
}

/**
 * Evaluate assignee condition
 */
const evaluateAssignee = (chore, operator, value, context) => {
  const { userId } = context

  // Handle special values
  if (value === 'me' && userId) {
    const isAssignedToMe =
      String(chore.assignedTo) === String(userId) ||
      chore.assignees?.some(a => String(a.userId) === String(userId))
    return operator === 'is' ? isAssignedToMe : !isAssignedToMe
  }

  if (value === 'others' && userId) {
    const isAssignedToOthers =
      String(chore.assignedTo) !== String(userId) &&
      !chore.assignees?.some(a => String(a.userId) === String(userId))
    return operator === 'is' ? isAssignedToOthers : !isAssignedToOthers
  }

  if (value === 'anyone') {
    return true
  }

  // Handle specific user IDs (can be array for multi-select)
  const userIds = Array.isArray(value) ? value : [value]
  const isAssigned = userIds.some(
    id =>
      String(chore.assignedTo) === String(id) ||
      chore.assignees?.some(a => String(a.userId) === String(id)),
  )

  return operator === 'is' ? isAssigned : !isAssigned
}

/**
 * Evaluate created by condition
 */
const evaluateCreatedBy = (chore, operator, value, context) => {
  const { userId } = context

  if (value === 'me' && userId) {
    return operator === 'is'
      ? String(chore.createdBy) === String(userId)
      : String(chore.createdBy) !== String(userId)
  }

  const creatorIds = Array.isArray(value) ? value : [value]
  const isCreatedBy = creatorIds.some(
    id => String(id) === String(chore.createdBy),
  )

  return operator === 'is' ? isCreatedBy : !isCreatedBy
}

/**
 * Evaluate priority condition
 */
const evaluatePriority = (chore, operator, value) => {
  const priorities = Array.isArray(value) ? value : [value]
  const chorePriority = chore.priority || 0

  switch (operator) {
    case 'is':
      return priorities.some(p => Number(p) === Number(chorePriority))
    case 'isNot':
      return !priorities.some(p => Number(p) === Number(chorePriority))
    case 'greaterThan':
      return Number(chorePriority) > Number(value)
    case 'lessThan':
      return Number(chorePriority) < Number(value)
    default:
      return false
  }
}

/**
 * Evaluate status condition
 */
const evaluateStatus = (chore, operator, value) => {
  const statuses = Array.isArray(value) ? value : [value]
  const choreStatus = chore.status || 0

  switch (operator) {
    case 'is':
      return statuses.some(s => Number(s) === Number(choreStatus))
    case 'isNot':
      return !statuses.some(s => Number(s) === Number(choreStatus))
    default:
      return false
  }
}

/**
 * Evaluate due date condition
 */
const evaluateDueDate = (chore, operator, value) => {
  const { nextDueDate } = chore

  // Handle "no due date" case
  if (operator === 'hasNoDueDate') {
    return nextDueDate === null || nextDueDate === undefined
  }

  if (operator === 'hasDueDate') {
    return nextDueDate !== null && nextDueDate !== undefined
  }

  if (!nextDueDate) return false

  const dueDate = new Date(nextDueDate)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  switch (operator) {
    case 'isOverdue':
      return dueDate < now

    case 'isDueToday':
      return dueDate.toDateString() === today.toDateString()

    case 'isDueTomorrow':
      return dueDate.toDateString() === tomorrow.toDateString()

    case 'isDueThisWeek': {
      const nextWeek = new Date(today)
      nextWeek.setDate(nextWeek.getDate() + 7)
      return dueDate >= today && dueDate < nextWeek
    }

    case 'isDueThisMonth': {
      return (
        dueDate.getMonth() === today.getMonth() &&
        dueDate.getFullYear() === today.getFullYear()
      )
    }

    case 'before': {
      const targetDate = value === 'today' ? today : new Date(value)
      return dueDate < targetDate
    }

    case 'after': {
      const targetDate = value === 'today' ? today : new Date(value)
      return dueDate > targetDate
    }

    case 'between': {
      const [start, end] = value
      return dueDate >= new Date(start) && dueDate <= new Date(end)
    }

    default:
      return false
  }
}

/**
 * Evaluate label condition
 */
const evaluateLabel = (chore, operator, value) => {
  const labelIds = Array.isArray(value) ? value : [value]
  const choreLabels = chore.labelsV2 || []

  const hasLabel = labelIds.some(labelId =>
    choreLabels.some(l => String(l.id) === String(labelId)),
  )

  switch (operator) {
    case 'has':
    case 'is':
      return hasLabel
    case 'doesNotHave':
    case 'isNot':
      return !hasLabel
    default:
      return false
  }
}

/**
 * Evaluate project condition
 */
const evaluateProject = (chore, operator, value) => {
  const { projectId } = chore

  // Convert to array for consistent handling
  const projectIds = Array.isArray(value) ? value : [value]

  // Check if 'default' is in the selection
  const includesDefault = projectIds.includes('default')

  // Check if chore is in default project (no projectId or projectId is 'default')
  const choreIsDefault =
    !projectId || projectId === null || projectId === 'default'

  // Check if chore matches any of the non-default project IDs
  const otherProjectIds = projectIds.filter(id => id !== 'default')
  const matchesOtherProject = otherProjectIds.some(
    id => String(projectId) === String(id),
  )

  // Chore matches if it's default and default is selected, OR if it matches any other selected project
  const isInProject = (includesDefault && choreIsDefault) || matchesOtherProject

  return operator === 'is' ? isInProject : !isInProject
}

/**
 * Apply a complete filter (with multiple conditions) to chores
 * @param {Array} chores - The chores to filter
 * @param {Object} filter - The filter with conditions
 * @param {Object} context - Additional context (userId, members, etc.)
 * @returns {Array} - Filtered chores
 */
export const applyFilter = (chores, filter, context = {}) => {
  if (!filter || !filter.conditions || filter.conditions.length === 0) {
    return chores
  }

  const { conditions, operator = 'AND' } = filter

  return chores.filter(chore => {
    if (operator === 'OR') {
      // At least one condition must match
      return conditions.some(condition =>
        evaluateCondition(chore, condition, context),
      )
    } else {
      // All conditions must match (AND)
      return conditions.every(condition =>
        evaluateCondition(chore, condition, context),
      )
    }
  })
}

/**
 * Get count of chores matching a filter
 * @param {Array} chores - The chores to count
 * @param {Object} filter - The filter to apply
 * @param {Object} context - Additional context
 * @returns {number} - Count of matching chores
 */
export const getFilterCount = (chores, filter, context = {}) => {
  return applyFilter(chores, filter, context).length
}

/**
 * Get count of overdue chores matching a filter
 * @param {Array} chores - The chores to count
 * @param {Object} filter - The filter to apply
 * @param {Object} context - Additional context
 * @returns {number} - Count of overdue chores
 */
export const getFilterOverdueCount = (chores, filter, context = {}) => {
  const filtered = applyFilter(chores, filter, context)
  return filtered.filter(chore => {
    if (!chore.nextDueDate) return false
    return new Date(chore.nextDueDate) < new Date()
  }).length
}

/**
 * Validate if a filter is still valid
 * (e.g., checks if referenced users/labels/projects still exist)
 * @param {Object} filter - The filter to validate
 * @param {Object} context - Context with available users, labels, projects
 * @returns {Object} - { isValid: boolean, issues: Array }
 */
export const validateFilter = (filter, context = {}) => {
  const { members = [], labels = [], projects = [] } = context
  const issues = []

  if (!filter.conditions || filter.conditions.length === 0) {
    issues.push('Filter has no conditions')
    return { isValid: false, issues }
  }

  filter.conditions.forEach((condition, index) => {
    const { type, value } = condition

    // Check assignee references
    if (type === 'assignee' && !['me', 'others', 'anyone'].includes(value)) {
      const userIds = Array.isArray(value) ? value : [value]
      const invalidUsers = userIds.filter(
        id => !members.some(m => m.id === id || m.userId === id),
      )
      if (invalidUsers.length > 0) {
        issues.push(`Condition ${index + 1}: User(s) no longer exist`)
      }
    }

    // Check label references
    if (type === 'label') {
      const labelIds = Array.isArray(value) ? value : [value]
      const invalidLabels = labelIds.filter(
        id => !labels.some(l => l.id === id),
      )
      if (invalidLabels.length > 0) {
        issues.push(`Condition ${index + 1}: Label(s) no longer exist`)
      }
    }

    // Check project references
    if (type === 'project' && value !== 'default') {
      const projectIds = Array.isArray(value) ? value : [value]
      const invalidProjects = projectIds.filter(
        id => !projects.some(p => p.id === id || p.id === Number(id)),
      )
      if (invalidProjects.length > 0) {
        issues.push(`Condition ${index + 1}: Project(s) no longer exist`)
      }
    }
  })

  return {
    isValid: issues.length === 0,
    issues,
  }
}

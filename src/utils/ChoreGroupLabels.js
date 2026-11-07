const GROUP_KEYS = {
  Started: 'started',
  'Pending Approval': 'pendingApproval',
  Overdue: 'overdue',
  Today: 'today',
  Tomorrow: 'tomorrow',
  Yesterday: 'yesterday',
  'Next 7 Days': 'next7Days',
  'Later This Month': 'laterThisMonth',
  Future: 'future',
  Anytime: 'anytime',
  Unknown: 'unknown',
  'No Priority': 'noPriority',
}

// Names remain stable for filtering and persisted state; translate only display.
export const getChoreGroupLabel = (name, groupBy, t) => {
  if (typeof name !== 'string' || groupBy === 'labels') return name
  const priority = name.match(/^Priority ([1-4])$/)
  if (groupBy === 'priority' && priority)
    return t('common:taskGroups.priority', { priority: priority[1] })
  const key = GROUP_KEYS[name]
  return key ? t(`common:taskGroups.${key}`) : name
}

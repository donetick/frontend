export const DEFAULT_SIDEPANEL_CONFIG = [
  {
    id: 'welcome', // legacy name, now represents User Switcher
    name: 'User Switcher',
    description: 'Allows admins/managers to view tasks as different users',
    iconName: 'SupervisorAccount',
    enabled: true,
    order: 0,
  },
  {
    id: 'assignees',
    name: 'Tasks by Assignee',
    description: 'Groups tasks by who they are assigned to',
    iconName: 'Person',
    enabled: true,
    order: 1,
  },
  {
    id: 'calendar',
    name: 'Calendar View',
    description: 'Shows tasks in a calendar format',
    iconName: 'CalendarMonth',
    enabled: true,
    order: 2,
  },
  {
    id: 'activities',
    name: 'Recent Activities',
    description: 'Shows recent task completions and activities',
    iconName: 'History',
    enabled: true,
    order: 3,
  },
  {
    id: 'weeklyGoals',
    name: 'Weekly Goals',
    description: 'Shows weekly progress and family completion stats',
    iconName: 'EmojiEvents',
    enabled: true,
    order: 4,
  },
]

export const getSidepanelConfig = () => {
  const saved = localStorage.getItem('sidepanelConfig')
  if (saved) {
    try {
      return JSON.parse(saved)
    } catch (error) {
      console.error('Error parsing sidepanel config:', error)
      return DEFAULT_SIDEPANEL_CONFIG
    }
  }
  return DEFAULT_SIDEPANEL_CONFIG
}

export const saveSidepanelConfig = config => {
  localStorage.setItem('sidepanelConfig', JSON.stringify(config))
  window.dispatchEvent(new Event('sidepanelConfigChanged'))
}

export const resetSidepanelConfig = () => {
  saveSidepanelConfig(DEFAULT_SIDEPANEL_CONFIG)
  return DEFAULT_SIDEPANEL_CONFIG
}

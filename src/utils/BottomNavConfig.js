// Pool of destinations the mobile bottom nav can be configured to show.
// `to` matches the routes used by the desktop NavBar drawer; `action`
// marks slots with special behavior instead of a route (search, more).
export const BOTTOM_NAV_ITEM_POOL = [
  {
    id: 'home',
    to: '/home',
    iconName: 'SpaceDashboard',
    translationKey: 'navigation.home',
    translationDefault: 'Home',
  },
  {
    id: 'tasks',
    to: '/chores',
    iconName: 'Checklist',
    translationKey: 'navigation.tasks',
    translationDefault: 'Tasks',
  },
  {
    id: 'search',
    action: 'search',
    iconName: 'SearchRounded',
    translationKey: 'navigation.search',
    translationDefault: 'Search',
  },
  {
    id: 'archived',
    to: '/archived',
    iconName: 'Archive',
    translationKey: 'navigation.archived',
    translationDefault: 'Archived',
  },
  {
    id: 'things',
    to: 'things',
    iconName: 'Widgets',
    translationKey: 'navigation.things',
    translationDefault: 'Things',
  },
  {
    id: 'labels',
    to: 'labels',
    iconName: 'ListAlt',
    translationKey: 'navigation.labels',
    translationDefault: 'Labels',
  },
  {
    id: 'projects',
    to: 'projects',
    iconName: 'FolderOpen',
    translationKey: 'navigation.projects',
    translationDefault: 'Projects',
  },
  {
    id: 'filters',
    to: 'filters',
    iconName: 'FilterAlt',
    translationKey: 'navigation.filters',
    translationDefault: 'Filters',
  },
  {
    id: 'activities',
    to: 'activities',
    iconName: 'History',
    translationKey: 'navigation.activities',
    translationDefault: 'Activities',
  },
  {
    id: 'points',
    to: 'points',
    iconName: 'Toll',
    translationKey: 'navigation.points',
    translationDefault: 'Points',
  },
  {
    id: 'settings',
    to: '/settings',
    iconName: 'SettingsOutlined',
    translationKey: 'navigation.settings',
    translationDefault: 'Settings',
  },
]

// The nav has a fixed 4th slot for "More" (opens the full drawer), so only
// this many slots are user-configurable.
export const MAX_BOTTOM_NAV_ITEMS = 4

const DEFAULT_ENABLED_IDS = ['home', 'tasks', 'search']

export const DEFAULT_BOTTOM_NAV_CONFIG = BOTTOM_NAV_ITEM_POOL.map(
  (item, index) => ({
    id: item.id,
    enabled: DEFAULT_ENABLED_IDS.includes(item.id),
    order: DEFAULT_ENABLED_IDS.includes(item.id)
      ? DEFAULT_ENABLED_IDS.indexOf(item.id)
      : index,
  }),
)

const STORAGE_KEY = 'bottomNavConfig'

export const getBottomNavConfig = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  let savedConfig = []

  if (saved) {
    try {
      savedConfig = JSON.parse(saved)
    } catch (error) {
      console.error('Error parsing bottom nav config:', error)
      return DEFAULT_BOTTOM_NAV_CONFIG
    }
  }

  // Merge saved config with default config so new pool items added later
  // show up (disabled) for existing users instead of being unreachable.
  return DEFAULT_BOTTOM_NAV_CONFIG.map(defaultItem => {
    const savedItem = savedConfig.find(item => item.id === defaultItem.id)
    return savedItem || defaultItem
  })
}

export const saveBottomNavConfig = config => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new Event('bottomNavConfigChanged'))
}

export const resetBottomNavConfig = () => {
  saveBottomNavConfig(DEFAULT_BOTTOM_NAV_CONFIG)
  return DEFAULT_BOTTOM_NAV_CONFIG
}

export const getEnabledBottomNavItems = () =>
  getBottomNavConfig()
    .filter(item => item.enabled)
    .sort((a, b) => a.order - b.order)
    .map(configItem =>
      BOTTOM_NAV_ITEM_POOL.find(poolItem => poolItem.id === configItem.id),
    )
    .filter(Boolean)

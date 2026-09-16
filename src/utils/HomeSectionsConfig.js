export const DEFAULT_HOME_SECTIONS_CONFIG = [
  {
    id: 'circle',
    name: 'Your Circle',
    description: 'Shows what everyone in your circle is carrying this week',
    iconName: 'Groups',
    enabled: true,
    order: 0,
  },
  {
    id: 'review',
    name: 'Needs Review',
    description: 'Finished tasks waiting to be signed off',
    iconName: 'FactCheck',
    enabled: true,
    order: 1,
  },
  {
    id: 'overdue',
    name: 'Overdue',
    description: 'Tasks that have slipped past their due date',
    iconName: 'ErrorOutline',
    enabled: true,
    order: 2,
  },
  {
    id: 'nextUp',
    name: 'Coming Up',
    description: "What's due today and tomorrow",
    iconName: 'Upcoming',
    enabled: true,
    order: 3,
  },
  {
    id: 'filters',
    name: 'Filters',
    description: 'Quick access to your pinned and most useful filters',
    iconName: 'FilterAlt',
    enabled: true,
    order: 4,
  },
  {
    id: 'projects',
    name: 'Projects',
    description: 'Where the work is piling up, by project',
    iconName: 'FolderOpen',
    enabled: true,
    order: 5,
  },
]

const STORAGE_KEY = 'homeSectionsConfig'

export const getHomeSectionsConfig = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  let savedConfig = []

  if (saved) {
    try {
      savedConfig = JSON.parse(saved)
    } catch (error) {
      console.error('Error parsing home sections config:', error)
      return DEFAULT_HOME_SECTIONS_CONFIG
    }
  }

  // Merge saved config with default config
  // This ensures new sections added to DEFAULT_HOME_SECTIONS_CONFIG show up for
  // existing users instead of silently disappearing.
  const mergedConfig = DEFAULT_HOME_SECTIONS_CONFIG.map(defaultItem => {
    const savedItem = savedConfig.find(item => item.id === defaultItem.id)
    return savedItem || defaultItem
  })

  // Keep any saved sections that are no longer in default, for backwards compat.
  const newSavedItems = savedConfig.filter(
    savedItem =>
      !DEFAULT_HOME_SECTIONS_CONFIG.find(item => item.id === savedItem.id),
  )

  return [...mergedConfig, ...newSavedItems]
}

export const saveHomeSectionsConfig = config => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new Event('homeSectionsConfigChanged'))
}

export const resetHomeSectionsConfig = () => {
  saveHomeSectionsConfig(DEFAULT_HOME_SECTIONS_CONFIG)
  return DEFAULT_HOME_SECTIONS_CONFIG
}

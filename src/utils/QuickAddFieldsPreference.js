import { useSyncExternalStore } from 'react'

export const QUICK_ADD_FIELDS = [
  {
    id: 'dueDate',
    labelKey: 'layout.quickAddSettings.fields.dueDate',
    defaultMore: false,
  },
  {
    id: 'repeat',
    labelKey: 'layout.quickAddSettings.fields.repeat',
    defaultMore: false,
  },
  {
    id: 'priority',
    labelKey: 'layout.quickAddSettings.fields.priority',
    defaultMore: false,
  },
  {
    id: 'assignee',
    labelKey: 'layout.quickAddSettings.fields.assignee',
    defaultMore: false,
  },
  {
    id: 'labels',
    labelKey: 'layout.quickAddSettings.fields.labels',
    defaultMore: false,
  },
  {
    id: 'attachments',
    labelKey: 'layout.quickAddSettings.fields.attachments',
    defaultMore: false,
  },
  {
    id: 'notifications',
    labelKey: 'layout.quickAddSettings.fields.notifications',
    defaultMore: false,
  },
  {
    id: 'points',
    labelKey: 'layout.quickAddSettings.fields.points',
    defaultMore: false,
  },
]

const STORAGE_KEY = 'quickAddMoreFields'
const CHANGE_EVENT = 'donetick:quick-add-fields-changed'
// Nothing is hidden by default: every field ships in the Quick Add row as it
// did before customization existed, and moving one behind "More" is opt-in.
const DEFAULT_FIELDS = QUICK_ADD_FIELDS.filter(field => field.defaultMore).map(
  field => field.id,
)
let cachedPreference

const readPreference = () => {
  if (cachedPreference) return cachedPreference
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY))
    cachedPreference = Array.isArray(stored)
      ? stored.filter(id => QUICK_ADD_FIELDS.some(field => field.id === id))
      : DEFAULT_FIELDS
  } catch {
    cachedPreference = DEFAULT_FIELDS
  }
  return cachedPreference
}

const subscribe = callback => {
  const onStorage = event => {
    if (event.key === STORAGE_KEY || event.key === null) {
      cachedPreference = undefined
      callback()
    }
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', onStorage)
  }
}

export const saveQuickAddMoreFields = fields => {
  cachedPreference = fields
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cachedPreference))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export const useQuickAddMoreFields = () =>
  useSyncExternalStore(subscribe, readPreference, () => DEFAULT_FIELDS)

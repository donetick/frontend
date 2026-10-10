import { useSyncExternalStore } from 'react'

const STORAGE_KEY = 'singlePageTaskEditor'
const CHANGE_EVENT = 'donetick:task-editor-preference-changed'

const getSinglePagePreference = () =>
  localStorage.getItem(STORAGE_KEY) === 'true'

const subscribe = callback => {
  const handleStorage = event => {
    if (event.key === STORAGE_KEY || event.key === null) callback()
  }
  window.addEventListener(CHANGE_EVENT, callback)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback)
    window.removeEventListener('storage', handleStorage)
  }
}

export const setSinglePageTaskEditor = enabled => {
  localStorage.setItem(STORAGE_KEY, String(!!enabled))
  window.dispatchEvent(new Event(CHANGE_EVENT))
}

export const useSinglePageTaskEditor = () =>
  useSyncExternalStore(subscribe, getSinglePagePreference, () => false)

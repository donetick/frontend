const OFFLINE_FEATURE_KEY = 'offline_feature_enabled'
const OFFLINE_FEATURE_EVENT = 'donetick:offline-feature-changed'

const parseBoolean = value => {
  if (value === null || typeof value === 'undefined') return true
  try {
    return JSON.parse(value) !== false
  } catch {
    return true
  }
}

export const isOfflineFeatureEnabled = () => {
  if (typeof window === 'undefined' || !window.localStorage) return true
  return parseBoolean(window.localStorage.getItem(OFFLINE_FEATURE_KEY))
}

export const setOfflineFeatureEnabled = enabled => {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(OFFLINE_FEATURE_KEY, JSON.stringify(!!enabled))
  window.dispatchEvent(
    new CustomEvent(OFFLINE_FEATURE_EVENT, {
      detail: { enabled: !!enabled },
    }),
  )
}

export const subscribeToOfflineFeature = callback => {
  if (typeof window === 'undefined') return () => {}

  const handleToggle = event => {
    if (event?.type === 'storage') {
      if (event.key !== OFFLINE_FEATURE_KEY) return
      callback(parseBoolean(event.newValue))
      return
    }

    callback(!!event?.detail?.enabled)
  }

  window.addEventListener(OFFLINE_FEATURE_EVENT, handleToggle)
  window.addEventListener('storage', handleToggle)

  return () => {
    window.removeEventListener(OFFLINE_FEATURE_EVENT, handleToggle)
    window.removeEventListener('storage', handleToggle)
  }
}

export const clearBrowserCacheStorage = async () => {
  if (typeof window === 'undefined' || !('caches' in window)) return
  try {
    const cacheKeys = await window.caches.keys()
    await Promise.all(cacheKeys.map(key => window.caches.delete(key)))
  } catch {
    // Ignore cache clear failures and continue with offline cleanup
  }
}

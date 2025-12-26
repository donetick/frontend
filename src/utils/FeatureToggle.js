export const FEATURES = {
  OFFLINE_MODE: 'experimental_feature_offline_mode',
}

/**
 * Get the current state of a feature flag from localStorage
 * @param {string} featureKey - The feature key from FEATURES constant
 * @param {boolean} defaultValue - Default value if feature is not set (default: false)
 * @returns {boolean} - Whether the feature is enabled
 */
export const isFeatureEnabled = (featureKey, defaultValue = false) => {
  try {
    const value = localStorage.getItem(featureKey)

    if (value === 'true') return true
    if (value === 'false') return false

    if (value === null || value === undefined) return defaultValue

    return Boolean(value)
  } catch (error) {
    console.warn(`FeatureToggle: Error reading feature "${featureKey}":`, error)
    return defaultValue
  }
}

/**
 * Set the state of a feature flag in localStorage
 * @param {string} featureKey - The feature key from FEATURES constant
 * @param {boolean} enabled - Whether to enable the feature
 */
export const setFeatureEnabled = (featureKey, enabled) => {
  try {
    localStorage.setItem(featureKey, enabled.toString())
  } catch (error) {
    console.error(
      `FeatureToggle: Error setting feature "${featureKey}":`,
      error,
    )
  }
}

export const toggleFeature = featureKey => {
  const currentState = isFeatureEnabled(featureKey)
  const newState = !currentState
  setFeatureEnabled(featureKey, newState)
  return newState
}

export const getAllFeatureStates = () => {
  const states = {}
  Object.entries(FEATURES).forEach(([name, key]) => {
    states[name] = isFeatureEnabled(key)
  })
  return states
}

export const clearAllFeatures = () => {
  try {
    Object.values(FEATURES).forEach(featureKey => {
      localStorage.removeItem(featureKey)
    })
  } catch (error) {
    console.error('FeatureToggle: Error clearing features:', error)
  }
}

/**
 * Check if the current instance is the official donetick.com service
 * @returns {Promise<boolean>} - Whether this is the official donetick.com instance
 */
export const isOfficialDonetickInstance = async () => {
  try {
    // Import here to avoid circular dependencies
    const { Preferences } = await import('@capacitor/preferences')
    const { API_URL } = await import('../Config')

    // Get custom server URL from preferences
    const { value: customServerUrl } = await Preferences.get({
      key: 'customServerUrl',
    })

    // Use custom URL if set, otherwise fall back to API_URL
    const serverUrl = customServerUrl || API_URL

    // Check if the server URL contains donetick.com
    return serverUrl.toLowerCase().includes('donetick.com')
  } catch (error) {
    console.warn('FeatureToggle: Error checking server instance:', error)
    // Default to false for safety (self-hosted assumption)
    return false
  }
}

/**
 * Synchronous version that checks based on current API manager state
 * Note: This requires apiManager to be initialized first
 * @returns {boolean} - Whether this is the official donetick.com instance
 */
export const isOfficialDonetickInstanceSync = () => {
  try {
    // Dynamic import to avoid circular dependencies
    return import('./apiClient').then(({ apiClient }) => {
      const currentApiUrl = apiClient.baseURL
      // Check if the API URL contains donetick.com
      return currentApiUrl.toLowerCase().includes('donetick.com')
    }).catch(error => {
      console.warn('FeatureToggle: Error checking server instance (sync):', error)
      // Default to false for safety (self-hosted assumption)
      return false
    })
  } catch (error) {
    console.warn('FeatureToggle: Error checking server instance (sync):', error)
    // Default to false for safety (self-hosted assumption)
    return false
  }
}

// Export default object for easier imports
export default {
  FEATURES,
  isFeatureEnabled,
  setFeatureEnabled,
  toggleFeature,
  getAllFeatureStates,
  clearAllFeatures,
  isOfficialDonetickInstance,
  isOfficialDonetickInstanceSync,
}

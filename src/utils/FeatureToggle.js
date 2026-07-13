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
    return import('./ApiClient')
      .then(({ apiClient }) => {
        const currentApiUrl =
          apiClient.baseURL || apiClient.customServerURL || ''
        if (!currentApiUrl || typeof currentApiUrl !== 'string') {
          return false
        }
        // Check if the API URL contains donetick.com
        return currentApiUrl.toLowerCase().includes('donetick.com')
      })
      .catch(error => {
        console.warn(
          'FeatureToggle: Error checking server instance (sync):',
          error,
        )
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
  isOfficialDonetickInstance,
  isOfficialDonetickInstanceSync,
}

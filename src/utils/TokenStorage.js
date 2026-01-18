import { Capacitor } from '@capacitor/core'
import { Preferences } from '@capacitor/preferences'

// Token storage keys
const TOKEN_KEYS = {
  ACCESS_TOKEN: 'token',
  ACCESS_TOKEN_EXPIRY: 'token_expiry',
  REFRESH_TOKEN: 'refresh_token',
  REFRESH_TOKEN_EXPIRY: 'refresh_token_expiry',
}

// Cache platform detection to avoid repeated checks
let _isNativePlatform = null

// Platform detection
const isNativePlatform = () => {
  if (_isNativePlatform === null) {
    try {
      _isNativePlatform =
        typeof window !== 'undefined' && window.Capacitor?.isNativePlatform?.()
    } catch (error) {
      console.warn('Platform detection failed, defaulting to web:', error)
      _isNativePlatform = false
    }
  }
  return _isNativePlatform
}

// Track if we're currently clearing tokens to prevent race conditions
let clearingTokens = false

/**
 * Save tokens based on platform
 * Web: Only access tokens to localStorage
 * Native: Access tokens to localStorage + refresh tokens to Capacitor Preferences
 */
export const saveTokens = async ({
  accessToken,
  accessTokenExpiry,
  refreshToken,
  refreshTokenExpiry,
}) => {
  try {
    // Always save access tokens to localStorage
    if (accessToken) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN, accessToken)
    }
    if (accessTokenExpiry) {
      localStorage.setItem(TOKEN_KEYS.ACCESS_TOKEN_EXPIRY, accessTokenExpiry)
    }
    if (refreshTokenExpiry) {
      localStorage.setItem(TOKEN_KEYS.REFRESH_TOKEN_EXPIRY, refreshTokenExpiry)
    }
    if (Capacitor.isNativePlatform()) {
      // On native platforms, also save refresh tokens to Capacitor Preferences
      try {
        if (refreshToken) {
          await Preferences.set({
            key: TOKEN_KEYS.REFRESH_TOKEN,
            value: refreshToken,
          })
        }
        if (refreshTokenExpiry) {
          await Preferences.set({
            key: TOKEN_KEYS.REFRESH_TOKEN_EXPIRY,
            value: refreshTokenExpiry,
          })
        }
      } catch (error) {
        console.error(
          'Failed to save refresh tokens to Capacitor Preferences:',
          error,
        )
        // Don't throw - access token is still saved to localStorage
      }
    }
  } catch (error) {
    console.error('Error saving tokens:', error)
    throw error
  }
}

/**
 * Get refresh token from storage
 * Web: Returns null (uses HTTP-only cookies)
 * Native: Returns from Capacitor Preferences
 */
export const getRefreshToken = async () => {
  if (!isNativePlatform()) {
    return null // Web uses HTTP-only cookies
  }

  try {
    const { value } = await Preferences.get({ key: TOKEN_KEYS.REFRESH_TOKEN })
    return value
  } catch (error) {
    console.error('Error reading refresh token from Preferences:', error)
    return null
  }
}

/**
 * Get refresh token expiry from storage
 * Web: Returns null (uses HTTP-only cookies)
 * Native: Returns from Capacitor Preferences
 */
export const getRefreshTokenExpiry = async () => {
  if (!isNativePlatform()) {
    return null // Web uses HTTP-only cookies
  }

  try {
    const { value } = await Preferences.get({
      key: TOKEN_KEYS.REFRESH_TOKEN_EXPIRY,
    })
    return value
  } catch (error) {
    console.error('Error reading refresh token expiry from Preferences:', error)
    return null
  }
}

/**
 * Check if refresh token is expired
 * Web: Returns false (backend handles cookie expiration)
 * Native: Checks expiry from Capacitor Preferences
 */
export const isRefreshTokenExpired = async () => {
  if (!isNativePlatform()) {
    return false // Web uses cookies, backend handles expiration
  }

  const expiry = await getRefreshTokenExpiry()
  if (!expiry) {
    return true // No expiry means no token
  }

  try {
    const expiryDate = new Date(expiry)
    if (isNaN(expiryDate.getTime())) {
      console.error('Invalid refresh token expiry date:', expiry)
      return true // Treat invalid date as expired
    }
    return new Date() >= expiryDate
  } catch (error) {
    console.error('Error parsing refresh token expiry:', error)
    return true // Treat parse error as expired
  }
}

/**
 * Clear all tokens from all storage locations
 * Idempotent - safe to call multiple times
 */
export const clearAllTokens = async () => {
  if (clearingTokens) {
    return // Already clearing, don't run concurrently
  }

  clearingTokens = true

  try {
    // Clear localStorage
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN)
    localStorage.removeItem(TOKEN_KEYS.ACCESS_TOKEN_EXPIRY)
    // Clean up legacy keys
    localStorage.removeItem('ca_token')
    localStorage.removeItem('ca_expiration')
    localStorage.removeItem('access_token')

    // Clear Capacitor Preferences on native
    if (isNativePlatform()) {
      try {
        await Preferences.remove({ key: TOKEN_KEYS.REFRESH_TOKEN })
        await Preferences.remove({ key: TOKEN_KEYS.REFRESH_TOKEN_EXPIRY })
      } catch (error) {
        console.error('Error clearing tokens from Preferences:', error)
      }
    }
  } catch (error) {
    console.error('Error clearing tokens:', error)
  } finally {
    clearingTokens = false
  }
}

/**
 * Export platform detection helper
 */
export const isNative = isNativePlatform

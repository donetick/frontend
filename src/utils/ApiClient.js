import { Preferences } from '@capacitor/preferences'
import { API_URL } from '../Config'
import { logout, RefreshToken } from './Fetcher'
import {
  clearAllTokens,
  isRefreshTokenExpired,
  saveTokens,
} from './TokenStorage'

class ApiClient {
  constructor() {
    this.customServerURL = `${API_URL}/api/v1`
    this.isRefreshing = false
    this.failedQueue = []
    this.lastRefreshTime = 0
    this.refreshCooldown = 3 * 1000 // 3 seconds in milliseconds
  }

  async init() {
    if (this.initPromise) {
      return this.initPromise
    }

    if (this.initialized) {
      return Promise.resolve()
    }

    this.initPromise = this._doInit()
    return this.initPromise
  }

  async _doInit() {
    const { value: serverURL } = await Preferences.get({
      key: 'customServerUrl',
    })

    this.customServerURL = `${serverURL || API_URL}/api/v1`
    this.initialized = true
  }
  getApiURL() {
    return this.customServerURL
  }

  async refreshToken() {
    // Check if refresh token is expired BEFORE attempting refresh
    const refreshExpired = await isRefreshTokenExpired()
    if (refreshExpired) {
      console.log('Refresh token expired, forcing logout')
      await clearAllTokens()
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
      return { success: false, error: 'Refresh token expired' }
    }

    if (this.isRefreshing) {
      return { success: false, error: 'Already refreshing' }
    }

    // Check cooldown
    const now = Date.now()
    if (now - this.lastRefreshTime < this.refreshCooldown) {
      return { success: false, error: 'Refresh cooldown active' }
    }

    this.isRefreshing = true

    try {
      const refreshReq = await RefreshToken()

      if (refreshReq.ok) {
        const data = await refreshReq.json()
        const newToken = data.token || data.access_token

        // Save all tokens including rotated refresh token
        await saveTokens({
          accessToken: newToken,
          accessTokenExpiry: data.expire || data.access_token_expiry,
          refreshToken: data.refresh_token,
          refreshTokenExpiry: data.refresh_token_expiry,
        })

        // Update last refresh time
        this.lastRefreshTime = Date.now()

        return { success: true, token: newToken }
      } else {
        return { success: false, error: 'Refresh failed' }
      }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      this.isRefreshing = false
    }
  }

  getToken() {
    return localStorage.getItem('token')
  }

  getHeaders(customHeaders = {}) {
  const headers = {}

  // Only add Content-Type if not explicitly removed
  if (!('Content-Type' in customHeaders)) {
    headers['Content-Type'] = 'application/json'
  } else if (customHeaders['Content-Type'] !== undefined) {
    // If Content-Type is present and NOT undefined, include it
    headers['Content-Type'] = customHeaders['Content-Type']
  }
  // If it's undefined, don't add it at all

  const token = this.getToken()
  if (token) {
    headers.Authorization = `Bearer ${token}`
  }

  const impersonateUserId = localStorage.getItem('impersonatedUserId')
  if (impersonateUserId) {
    headers['X-Impersonate-User-ID'] = impersonateUserId
  }

  // Add other custom headers (except Content-Type which we already handled)
  Object.keys(customHeaders).forEach(key => {
    if (key !== 'Content-Type' && customHeaders[key] !== undefined) {
      headers[key] = customHeaders[key]
    }
  })

  return headers
}

  // Process queued requests after refresh attempt
  processQueue(error, token = null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token)
      }
    })

    this.failedQueue = []
  }

  // Helper to avoid repeating cleanup code
  async handleLogout() {
    await clearAllTokens()
    try {
      await logout()
    } catch (e) {
      console.error('Error during logout', e)
    }

    if (window.location.pathname !== '/login') window.location.href = '/login'
    // fire and forget
  }
  async request(endpoint, options = {}) {
    await this.init()
    const url = `${this.customServerURL}${endpoint}`
    const config = {
      // credentials: 'include',
      ...options,
      headers: this.getHeaders(options.headers),
    }

    try {
      // 1. Initial Request
      let response = await fetch(url, config)

      // 2. Check for 401 (Unauthorized)
      if (response.status === 401) {
        // Always queue this request first
        const queuedPromise = new Promise((resolve, reject) => {
          this.failedQueue.push({
            resolve: async token => {
              if (!token) {
                reject(new Error('Token refresh failed'))
                return
              }
              try {
                const newHeaders = this.getHeaders(options?.headers)
                const retryConfig = {
                  ...config,
                  headers: newHeaders,
                }
                const retryResponse = await fetch(url, retryConfig)
                resolve(retryResponse)
              } catch (error) {
                reject(error)
              }
            },
            reject,
          })
        })

        // If already refreshing, just return the queued promise
        if (this.isRefreshing) {
          console.log('Token refresh already in progress, queueing request')
          return queuedPromise
        }

        // Attempt to refresh the token
        const refreshResult = await this.refreshToken()

        if (refreshResult.success) {
          // Process queue with success - this will retry all queued requests
          this.processQueue(null, refreshResult.token)
        } else if (refreshResult.error === 'Refresh cooldown active') {
          // We're in cooldown - token was just refreshed, retry with current token
          console.log('Refresh cooldown - retrying with current token')
          const currentToken = this.getToken()
          if (currentToken) {
            this.processQueue(null, currentToken)
          } else {
            this.processQueue(new Error('No token available'), null)
            this.handleLogout()
            return null
          }
        } else if (refreshResult.error === 'Already refreshing') {
          // This shouldn't happen since we check isRefreshing above, but handle it anyway
          console.log('Already refreshing - waiting for refresh to complete')
          return queuedPromise
        } else {
          // Actual refresh failure - logout
          this.processQueue(new Error(refreshResult.error), null)
          this.handleLogout()
          return null
        }

        // Return the queued promise for this request
        return queuedPromise
      }

      return response
    } catch (error) {
      console.error('Request failed', error)
      throw error
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    })
  }

  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' })
  }

async upload(endpoint, formData, options = {}) {
  return this.request(endpoint, {
    ...options,
    method: 'POST',
    body: formData,
    headers: {
      ...options.headers,
      'Content-Type': undefined,  // Explicitly mark as removed
    },
  })
}


  getAssetURL(path) {
    return `${this.customServerURL}/assets/${path}`
  }
}

export const apiClient = new ApiClient()

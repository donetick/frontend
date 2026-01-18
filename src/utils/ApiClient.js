import { API_URL } from '../Config'
import { logout, RefreshToken } from './Fetcher'
import {
  clearAllTokens,
  isRefreshTokenExpired,
  saveTokens,
} from './TokenStorage'

class ApiClient {
  constructor() {
    this.baseURL = `${API_URL}/api/v1`
    this.isRefreshing = false
    this.failedQueue = []
    this.lastRefreshTime = 0
    this.refreshCooldown = 3 * 1000 // 3 seconds in milliseconds
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
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    }

    const token = this.getToken()
    if (token) {
      headers.Authorization = `Bearer ${token}`
    }

    const impersonateUserId = localStorage.getItem('impersonatedUserId')
    if (impersonateUserId) {
      headers['X-Impersonate-User-ID'] = impersonateUserId
    }

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
    logout().then(async () => {
      await clearAllTokens()
      if (window.location.pathname !== '/login') window.location.href = '/login'
    }) // fire and forget
  }
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`
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
          return queuedPromise
        }

        // Check if we're within the refresh cooldown period
        const now = Date.now()
        if (now - this.lastRefreshTime < this.refreshCooldown) {
          console.warn('Token refresh attempted too soon, forcing logout')
          this.processQueue(new Error('Refresh cooldown active'), null)
          this.handleLogout()
          return null
        }

        const refreshResult = await this.refreshToken()

        if (refreshResult.success) {
          // Process queue with success - this will retry all queued requests
          this.processQueue(null, refreshResult.token)
        } else {
          // Refresh failed
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
    const headers = options.headers || {}
    delete headers['Content-Type']

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: formData,
      headers,
    })
  }

  getAssetURL(path) {
    return `${this.baseURL}/assets/${path}`
  }
}

export const apiClient = new ApiClient()

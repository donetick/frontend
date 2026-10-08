import { Preferences } from '@capacitor/preferences'

import { API_URL } from '../Config'
import { networkManager } from '../hooks/NetworkManager'
import {
  recordApiFailure,
  recordServerVersionFromResponse,
} from '../service/DiagnosticsSession'
import { logout, RefreshToken } from './Fetcher'
import { isOAuthExchangeInProgress } from './OAuthExchangeState'
import { offlineDB } from './OfflineDB'
import {
  clearAllTokens,
  isRefreshTokenExpired,
  saveTokens,
} from './TokenStorage'

const OAUTH_EXCHANGE_IN_PROGRESS = 'OAuth exchange in progress'

class ApiClient {
  constructor() {
    this.customServerURL = `${API_URL}/api/v1`
    this.isRefreshing = false
    this.failedQueue = []
    this.lastRefreshTime = 0
    this.refreshCooldown = 3 * 1000 // 3 seconds in milliseconds
    this.logoutPromise = null
  }

  async init(force = false) {
    if (this.initPromise && !force) {
      return this.initPromise
    }

    if (this.initialized && !force) {
      return Promise.resolve()
    }

    this.initPromise = this._doInit().finally(() => {
      this.initPromise = null
    })
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
    // No session exists yet while an OAuth code exchange is in flight, so there
    // is nothing to refresh. Callers must treat this as a non-fatal failure
    // (see request()) rather than an expired session.
    if (isOAuthExchangeInProgress()) {
      return { success: false, error: OAUTH_EXCHANGE_IN_PROGRESS }
    }

    // Check if refresh token is expired BEFORE attempting refresh
    const refreshExpired = await isRefreshTokenExpired()
    if (refreshExpired) {
      console.log('Refresh token expired, forcing logout')
      await this.handleLogout()
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
    this.failedQueue.forEach(({ reject, resolve }) => {
      if (error) {
        reject(error)
      } else {
        resolve(token)
      }
    })

    this.failedQueue = []
  }

  // Share one logout operation between every caller so cleanup cannot overlap.
  async handleLogout() {
    // Never tear down the session while an OAuth exchange is running, or we
    // clear the tokens it just saved and reload the page out from under it.
    if (isOAuthExchangeInProgress()) {
      console.log('Skipping forced logout: OAuth exchange in progress')
      return
    }

    if (this.logoutPromise) {
      return this.logoutPromise
    }

    this.logoutPromise = this.performLogout()
    try {
      await this.logoutPromise
    } finally {
      this.logoutPromise = null
    }
  }

  async performLogout() {
    // An expired session on an invite link would otherwise drop the code on the
    // way to /login. Stash it first so sign-in returns to the join.
    try {
      const { pathname, search } = window.location
      if (pathname === '/circle/join') {
        const code = new URLSearchParams(search).get('code')
        if (code) {
          const { setPendingInvite } = await import('./PendingInvite')
          setPendingInvite(code)
        }
      }
    } catch (e) {
      console.error('Error preserving pending invite on logout', e)
    }

    // This request bypasses 401 recovery: an already-expired session must not
    // recursively start another refresh/logout while cleanup is in progress.
    try {
      const { unregisterPushNotifications } =
        await import('../CapacitorListener')
      await unregisterPushNotifications()
    } catch (e) {
      console.error('Error unregistering push device on logout', e)
    }

    await clearAllTokens()
    try {
      await offlineDB.clearAll()
    } catch (e) {
      console.error('Error clearing offline data on logout', e)
    }
    try {
      // Dynamic import sidesteps the ApiClient <-> ImageCache module cycle
      const { clearImageCache } = await import('./ImageCache')
      await clearImageCache()
    } catch (e) {
      console.error('Error clearing image cache on logout', e)
    }
    try {
      // Dynamic import sidesteps the ApiClient <-> WidgetService module cycle
      const { clearWidgetData } = await import('../service/WidgetService')
      await clearWidgetData()
    } catch (e) {
      console.error('Error clearing widget data on logout', e)
    }
    try {
      await logout()
    } catch (e) {
      console.error('Error during logout', e)
    }

    if (window.location.pathname !== '/login') window.location.href = '/login'
  }
  async request(endpoint, options = {}) {
    await this.init()
    const url = `${this.customServerURL}${endpoint}`
    const { skipAuthRecovery = false, ...fetchOptions } = options

    // Abort after 10s so a dead/unreachable server doesn't hang the UI
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10_000)

    const config = {
      // credentials: 'include',
      ...fetchOptions,
      headers: this.getHeaders(fetchOptions.headers),
      signal: fetchOptions.signal ?? controller.signal,
    }

    try {
      // 1. Initial Request
      let response = await fetch(url, config)
      clearTimeout(timeoutId)

      // Passive diagnostics: learn the server build from whatever it already
      // answers, and keep the last few refusals for crash reports.
      recordServerVersionFromResponse(response)
      if (!response.ok) {
        recordApiFailure({
          endpoint,
          method: config.method,
          status: response.status,
        })
      }

      // Logout cleanup may legitimately receive a 401. Return it directly
      // instead of recursively attempting refresh/logout again.
      if (response.status === 401 && (skipAuthRecovery || this.logoutPromise)) {
        return response
      }

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
        // Some failure branches return null/the original response rather than
        // this promise. Keep their intentional queue rejection from becoming
        // an unhandled promise rejection.
        queuedPromise.catch(() => {})

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
            await this.handleLogout()
            return null
          }
        } else if (refreshResult.error === OAUTH_EXCHANGE_IN_PROGRESS) {
          // Expected 401: the code exchange hasn't produced tokens yet. Fail
          // just this request — logging out here would wipe storage and hard
          // navigate to /login, aborting the exchange fetch mid-flight.
          this.processQueue(new Error(refreshResult.error), null)
          return response
        } else if (refreshResult.error === 'Already refreshing') {
          // This shouldn't happen since we check isRefreshing above, but handle it anyway
          console.log('Already refreshing - waiting for refresh to complete')
          return queuedPromise
        } else {
          this.processQueue(new Error(refreshResult.error), null)
          // An expired refresh token already awaited logout in refreshToken().
          // Other refresh failures still need to start it here.
          if (refreshResult.error !== 'Refresh token expired') {
            await this.handleLogout()
          }
          return null
        }

        // Return the queued promise for this request
        return queuedPromise
      }

      return response
    } catch (error) {
      clearTimeout(timeoutId)
      // fetch() threw = network-level failure or timeout — mark server
      // unreachable. Caller-initiated aborts (component unmount, query
      // cancellation) say nothing about server health, so skip those.
      const externalAbort =
        error?.name === 'AbortError' && fetchOptions.signal?.aborted
      if (!externalAbort) {
        networkManager.setServerUnreachable()
        recordApiFailure({ endpoint, method: config.method, status: 'network' })
      }
      console.error('Request failed', error)
      throw error
    }
  }

  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' })
  }

  async post(endpoint, data, options = {}) {
    options.headers = options.headers || {}
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json'
    }

    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: data ? data : undefined,
    })
  }

  async put(endpoint, data, options = {}) {
    options.headers = options.headers || {}
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json'
    }
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: data ? data : undefined,
    })
  }

  async delete(endpoint, options = {}) {
    options.headers = options.headers || {}
    if (!options.headers['Content-Type']) {
      options.headers['Content-Type'] = 'application/json'
    }
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
    return `${this.customServerURL}/assets/${path}`
  }
}

export const apiClient = new ApiClient()

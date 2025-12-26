import { API_URL } from '../Config'
import { RefreshToken } from './Fetcher'

class ApiClient {
  constructor() {
    this.baseURL = `${API_URL}/api/v1`
    this.isRefreshing = false
    this.failedQueue = []
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
  handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('token_expiry')
    window.location.href = '/login'
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
        if (!this.isRefreshing) {
          this.isRefreshing = true

          try {
            // Attempt to refresh token
            const refreshReq = await RefreshToken()

            if (refreshReq.ok) {
              const data = await refreshReq.json()
              const newToken = data.token || data.access_token

              // Update Local Storage
              localStorage.setItem('token', newToken)
              if (data.expire || data.access_token_expiry) {
                localStorage.setItem(
                  'token_expiry',
                  data.expire || data.access_token_expiry,
                )
              }

              // Process queue with success
              this.processQueue(null, newToken)

              // Retry the original request with new token
              const newHeaders = this.getHeaders(options?.headers)
              const retryConfig = {
                ...config,
                headers: newHeaders,
              }

              response = await fetch(url, retryConfig)

              // If it fails again with 401, force logout
              if (response.status === 401) {
                this.handleLogout()
                return null
              }
            } else {
              // Refresh failed (e.g., refresh token expired)
              this.processQueue(new Error('Token refresh failed'), null)
              this.handleLogout()
              return null
            }
          } finally {
            this.isRefreshing = false
          }
        } else {
          // Token is currently being refreshed, queue this request
          return new Promise((resolve, reject) => {
            this.failedQueue.push({
              resolve: (token) => {
                // Retry the original request with new token
                const newHeaders = this.getHeaders(options?.headers)
                const retryConfig = {
                  ...config,
                  headers: newHeaders,
                }
                resolve(fetch(url, retryConfig))
              },
              reject
            })
          })
        }
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

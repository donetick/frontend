import { createContext, useContext, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clearAllTokens, saveTokens } from '../utils/TokenStorage'
import { apiClient } from '../utils/apiClient'

const AuthContext = createContext(null)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(() => localStorage.getItem('token'))
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const navigate = useNavigate()
  const baseURL = apiClient.getApiURL()
  const isAuthenticated = !!token

  const isTokenExpired = () => {
    const expiry = localStorage.getItem('token_expiry')
    if (!expiry) return false
    return new Date() >= new Date(expiry)
  }

  const clearAuth = async () => {
    setToken(null)
    setUser(null)
    await clearAllTokens()
  }

  const login = async credentials => {
    setIsLoading(true)
    try {
      const response = await fetch(`${baseURL}/auth/login`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      })

      if (!response.ok) {
        const error = await response.json()
        return { success: false, error: error.message || 'Login failed' }
      }

      const data = await response.json()
      const userToken = data.token || data.access_token

      if (userToken) {
        setToken(userToken)

        // Use centralized token storage
        await saveTokens({
          accessToken: userToken,
          accessTokenExpiry: data.expire || data.access_token_expiry,
          refreshToken: data.refresh_token,
          refreshTokenExpiry: data.refresh_token_expiry,
        })
      }

      setIsLoading(false)
      return { success: true, data }
    } catch (error) {
      setIsLoading(false)
      return { success: false, error: 'Network error' }
    }
  }

  const fetchUser = async () => {
    if (!token) return null

    try {
      const response = await apiClient.get('/users/profile')

      if (!response.ok) {
        return null
      }

      const userData = await response.json()
      setUser(userData)
      return userData
    } catch (error) {
      console.error('Fetch user error:', error)
      return null
    }
  }

  useEffect(() => {
    // const initAuth = async () => {
    //   if (token && !isTokenExpired()) {
    //     await fetchUser()
    //   } else if (token && isTokenExpired()) {
    //     // Token is expired, but don't refresh here
    //     // Let the first API call handle refresh via ApiClient
    //     // Just try to fetch user - if it fails, ApiClient will handle refresh
    //     await fetchUser()
    //   } else {
    //     clearAuth()
    //     navigate('/login')
    //   }
    //   setIsLoading(false)
    // }
    // initAuth()
  }, [token, navigate])

  const value = {
    token,
    user,
    isLoading,
    isAuthenticated,
    login,
    fetchUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

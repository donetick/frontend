import { useQuery, useQueryClient } from '@tanstack/react-query'

import {
  GetAllCircleMembers,
  GetAllUsers,
  GetChildUsers,
  GetDeviceTokens,
  GetUserProfile,
} from '../utils/Fetcher'
import { offlineDB } from '../utils/OfflineDB'

// Helper to check if we have a valid token
const isTokenValid = () => {
  const token = localStorage.getItem('token')
  if (!token) return false

  const expiry = localStorage.getItem('token_expiry')
  if (!expiry) return true // No expiry set, assume valid

  return new Date() < new Date(expiry)
}

export const useAllUsers = () => {
  return useQuery({
    queryKey: ['allUsers'],
    queryFn: GetAllUsers,
  })
}

export const useCircleMembers = () => {
  const queryClient = useQueryClient()

  const { data, error, isLoading } = useQuery({
    queryKey: ['allCircleMembers'],
    queryFn: async () => {
      try {
        const result = await GetAllCircleMembers()
        // Cache for offline use
        if (result?.res) {
          offlineDB.saveKV('circle_members', result.res).catch(() => {})
        }
        return result
      } catch {
        const cached = await offlineDB.getKV('circle_members')
        if (cached) return { res: cached }
        return { res: [] }
      }
    },
  })

  const handleRefetch = () => {
    queryClient.invalidateQueries(['allCircleMembers'])
  }

  return { data, error, isLoading, handleRefetch }
}

export const useUserProfile = () => {
  const queryClient = useQueryClient()
  const token = localStorage.getItem('token')

  const { data, error, isLoading } = useQuery({
    queryKey: ['userProfile', token],
    queryFn: async () => {
      if (!token) {
        return null
      }

      try {
        const resp = await GetUserProfile()
        const result = await resp.json()
        // if we got 403 then user probably deleted their account and token is still valid. navigate to login
        if (result?.res) {
          await offlineDB.saveKV('user_profile', result.res)
        }
        return result.res || null
      } catch {
        // API unreachable — only serve cached profile for authenticated sessions
        return await offlineDB.getKV('user_profile')
      }
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    enabled: !!token,
  })
  return {
    data,
    error,
    isLoading,
    refetch: () => queryClient.invalidateQueries(['userProfile']),
  }
}

export const useDeviceTokens = () => {
  const queryClient = useQueryClient()

  const { data, error, isLoading } = useQuery({
    queryKey: ['deviceTokens'],
    queryFn: async () => {
      if (!isTokenValid()) {
        return null
      }
      const resp = await GetDeviceTokens(true) // Only get active devices
      const result = await resp.json()
      return result.res || []
    },
    staleTime: 0, // Always fetch fresh data
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    data,
    error,
    isLoading,
    refetch: () => queryClient.invalidateQueries(['deviceTokens']),
  }
}

export const useChildUsers = () => {
  const queryClient = useQueryClient()

  const { data, error, isLoading } = useQuery({
    queryKey: ['childUsers'],
    queryFn: async () => {
      if (!isTokenValid()) {
        return null
      }
      const resp = await GetChildUsers()
      const result = await resp.json()
      return result.res || []
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  })

  return {
    data,
    error,
    isLoading,
    refetch: () => queryClient.invalidateQueries(['childUsers']),
  }
}

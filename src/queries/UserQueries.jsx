import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  GetAllCircleMembers,
  GetAllUsers,
  GetChildUsers,
  GetDeviceTokens,
  GetUserProfile,
} from '../utils/Fetcher'
import { isTokenValid } from '../utils/TokenManager'

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
    queryFn: GetAllCircleMembers,
  })

  const handleRefetch = () => {
    queryClient.invalidateQueries(['allCircleMembers'])
  }

  return { data, error, isLoading, handleRefetch }
}

export const useUserProfile = () => {
  const queryClient = useQueryClient()

  const { data, error, isLoading } = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      if (!isTokenValid()) {
        return null // Token is invalid, return null to indicate no profile
      }
      const resp = await GetUserProfile()
      const result = await resp.json()
      // if we got 403 then user probably deleted their account and token is still valid. navigate to login
      if (resp.status === 403) {
        localStorage.removeItem('ca_token')
        localStorage.removeItem('ca_expiration')
        window.location.href = '/login'
        return null
      }

      return result.res // Return the actual user profile data
    },
    staleTime: 30 * 60 * 1000, // 30 minutes in milliseconds
    gcTime: 30 * 60 * 1000, // 30 minutes in milliseconds
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

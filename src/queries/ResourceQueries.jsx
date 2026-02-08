import { useQuery } from '@tanstack/react-query'
import { GetResource } from '../utils/Fetcher'

// Helper to check if we have a valid token
const isTokenValid = () => {
  const token = localStorage.getItem('token')
  if (!token) return false

  const expiry = localStorage.getItem('token_expiry')
  if (!expiry) return true // No expiry set, assume valid

  return new Date() < new Date(expiry)
}

export const useResource = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource'],
    queryFn: async () => {
      const response = await GetResource()
      return response
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    enabled: isTokenValid(), // Only run query when we have a valid token
  })
  return { data, isLoading, error }
}

import { useQuery } from '@tanstack/react-query'

import { setServerVersion } from '../service/DiagnosticsSession'
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
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['resource'],
    queryFn: async () => {
      const response = await GetResource()
      // The backend only names its build here, so this is also where crash
      // reports learn which server version the user was talking to.
      setServerVersion(response?.api_version, response?.api_commit)
      return response
    },
    staleTime: 6 * 60 * 60 * 1000, // 6 hours in milliseconds
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  return { data, isLoading, error, refetch }
}

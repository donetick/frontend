import { useQuery } from '@tanstack/react-query'
import { GetResource } from '../utils/Fetcher'

export const useResource = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource'],
    queryFn: async () => {
      const response = await GetResource()
      return response
    },
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  return { data, isLoading, error }
}

import { useQuery } from '@tanstack/react-query'
import { GetResource } from '../utils/Fetcher'

export const useResource = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource'],
    queryFn: () => GetResource(),
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  return { data, isLoading, error }
}

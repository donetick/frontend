import { useQuery } from '@tanstack/react-query'
import { GetResource } from '../utils/Fetcher'

export const useResource = () => {
  const { data, isLoading, error } = useQuery({
    queryKey: ['resource'],
    queryFn: GetResource,
    cacheTime: 1000 * 60 * 10, // 10 minutes
  })
  return { data, isLoading, error }
}

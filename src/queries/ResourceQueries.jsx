import { useQuery } from 'react-query'
import { GetResource } from '../utils/Fetcher'

export const useResource = () => {
  const { data, isLoading, error } = useQuery('resource', GetResource, {
    cacheTime: 1000 * 60 * 10, // 1 minute
  })
  return { data, isLoading, error }
}

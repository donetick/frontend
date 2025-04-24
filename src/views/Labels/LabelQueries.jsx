import { useQuery } from '@tanstack/react-query'
import { GetLabels } from '../../utils/Fetcher'
export const useLabels = () => {
  return useQuery({
    queryKey: ['labels'],
    queryFn: GetLabels,
    initialData: [],
  })
}

import { useQuery } from 'react-query'
import { GetLabels } from '../../utils/Fetcher'

export const useLabels = () => {
  return useQuery('labels', GetLabels, {
    initialData: [],
  })
}

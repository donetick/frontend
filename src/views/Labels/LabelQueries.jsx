import { useQuery } from '@tanstack/react-query'
import { CreateLabel, GetLabels } from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'

export const useLabels = () => {
  return useQuery({
    queryKey: ['labels'],
    queryFn: async () => {
      try {
        const data = await GetLabels()
        const labels = Array.isArray(data?.res)
          ? data.res
          : Array.isArray(data)
            ? data
            : []

        if (labels.length > 0) {
          offlineDB.saveKV('labels', labels)
        }
        return labels
      } catch {
        const cached = await offlineDB.getKV('labels')
        if (Array.isArray(cached)) return cached
        return []
      }
    },
  })
}

export const useCreateLabel = () => {
  return useQuery({
    queryKey: ['createLabel'],
    queryFn: CreateLabel,
  })
}

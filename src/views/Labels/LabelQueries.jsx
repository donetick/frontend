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

        // An empty response is authoritative too (e.g. a shared label became
        // private). Do not resurrect previously visible labels while offline.
        offlineDB.saveKV('labels', labels).catch(() => {})
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

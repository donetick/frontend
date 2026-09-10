import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  CreateLabel,
  DeleteLabel,
  GetLabels,
  UpdateLabel,
} from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'

// The Fetcher functions route themselves to the local repositories when the
// app is in local mode, so these hooks stay mode-agnostic.

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
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: CreateLabel,
    onSuccess: () => queryClient.invalidateQueries(['labels']),
  })
}

export const useUpdateLabel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: UpdateLabel,
    onSuccess: () => {
      queryClient.invalidateQueries(['labels'])
      // Labels are denormalised into chores, so the lists have to re-read.
      queryClient.invalidateQueries(['chores'])
    },
  })
}

export const useDeleteLabel = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: DeleteLabel,
    onSuccess: () => {
      queryClient.invalidateQueries(['labels'])
      queryClient.invalidateQueries(['chores'])
    },
  })
}

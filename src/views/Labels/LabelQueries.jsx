import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { shouldUseLocalFirstStore } from '../../data/accountLocalFirst'
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
        // Under the flag, GetLabels already routed to labelRepo (see
        // Fetcher.jsx) — a throw here means the repo call itself failed, so
        // falling back to this stale KV blob would just mask that.
        if (shouldUseLocalFirstStore()) throw new Error('Failed to load labels')
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

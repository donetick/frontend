import { useQuery } from '@tanstack/react-query'

import { GetRedemptions, GetRewards } from '../../utils/Fetcher'
import { offlineDB } from '../../utils/OfflineDB'

export const useRewards = () => {
  return useQuery({
    queryKey: ['rewards'],
    queryFn: async () => {
      try {
        const data = await GetRewards()
        const rewards = Array.isArray(data) ? data : []
        if (rewards.length > 0) {
          offlineDB.saveKV('rewards', rewards)
        }
        return rewards
      } catch {
        const cached = await offlineDB.getKV('rewards')
        if (Array.isArray(cached)) return cached
        return []
      }
    },
  })
}

// status: 'pending' | 'approved' | 'rejected' | undefined (all, scoped to the
// caller — admins/managers get the whole circle, everyone else gets their own)
export const useRedemptions = status => {
  return useQuery({
    queryKey: ['redemptions', status || 'all'],
    queryFn: async () => {
      const data = await GetRedemptions(status)
      return Array.isArray(data) ? data : []
    },
  })
}

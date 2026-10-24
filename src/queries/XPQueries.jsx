import { useQuery } from '@tanstack/react-query'

import { apiClient } from '../utils/ApiClient'
import { useUserProfile } from './UserQueries'

export const xpRequest = async (path, method = 'GET', body) => {
  const response = await apiClient.request(path, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  if (!response.ok) throw new Error('Unable to load or save XP data')
  return response.json()
}

export const useXPCategories = () => {
  const { data: profile } = useUserProfile()
  return useQuery({
    queryKey: ['xpCategories', profile?.id, profile?.circleID],
    queryFn: async () => (await xpRequest('/xp/categories')).res,
    enabled: !!profile?.circleID,
  })
}

export const useXPLeaderboard = () => {
  const { data: profile } = useUserProfile()
  const circleId = profile?.circleID
  return useQuery({
    queryKey: ['xpLeaderboard', profile?.id, circleId],
    queryFn: () => xpRequest(`/circles/${circleId}/xp`),
    enabled: !!circleId,
    staleTime: 0,
  })
}

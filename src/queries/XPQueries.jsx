import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { apiClient } from '../utils/ApiClient'
import { xpTranslationKey } from '../utils/XPTranslation'
import { useUserProfile } from './UserQueries'

export const xpRequest = async (path, method = 'GET', body, requestKey) => {
  const response = await apiClient.request(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    ...(requestKey ? { headers: { 'Idempotency-Key': requestKey } } : {}),
  })
  const data = await response.json()
  if (!response.ok) throw new Error(data.error || 'Unable to update XP')
  return data
}

export const useXP = () => {
  const { data: user } = useUserProfile()
  const scope = [apiClient.getApiURL(), user?.id, user?.circleID]
  const settings = useQuery({
    queryKey: ['xp', ...scope, 'settings'],
    queryFn: () => xpRequest('/xp/settings'),
    enabled: Boolean(user?.id && user?.circleID),
    retry: false,
  })
  const categories = useQuery({
    queryKey: ['xp', ...scope, 'categories'],
    queryFn: () => xpRequest('/xp/categories'),
    enabled: Boolean(user?.id && user?.circleID),
    retry: false,
  })
  return { user, xpMode: Boolean(settings.data?.xpMode), settings, categories }
}

export const useUserXP = userID => {
  const { data: user } = useUserProfile()
  return useQuery({
    queryKey: [
      'xp',
      apiClient.getApiURL(),
      user?.id,
      user?.circleID,
      'user',
      userID,
    ],
    queryFn: () => xpRequest(`/users/${userID}/xp`),
    enabled: Boolean(user?.id && user?.circleID && userID),
    retry: false,
  })
}

export const useRefreshXP = () => {
  const client = useQueryClient()
  return () =>
    Promise.all([
      client.invalidateQueries({ queryKey: ['xp'] }),
      client.invalidateQueries({ queryKey: ['allCircleMembers'] }),
    ])
}

// Explicit XP keys use normal language fallback, without silently reverting
// to an existing Points label when a locale has not translated the XP variant.
export const useXPTranslation = namespace => {
  const translation = useTranslation(namespace)
  const { xpMode } = useXP()
  const { i18n, t: baseT } = translation
  const t = useCallback(
    (key, options) =>
      baseT(xpTranslationKey(i18n, namespace, key, options, xpMode), options),
    [baseT, i18n, namespace, xpMode],
  )
  return { ...translation, t, xpMode }
}

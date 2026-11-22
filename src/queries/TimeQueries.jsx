import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  ClearChoreTimer,
  DeleteTimeSession,
  GetChoreTimer,
  PauseChore,
  ResetChoreTimer,
  StartChore,
  UpdateTimeSession,
} from '../utils/Fetcher'

const refreshTimerQueries = (queryClient, choreId) => {
  const id = String(choreId)
  return Promise.all([
    ...['chore', 'choreTimer', 'choreHistory'].map(key =>
      queryClient.invalidateQueries({ queryKey: [key, id] }),
    ),
    queryClient.invalidateQueries({ queryKey: ['chores'] }),
  ])
}

// Publish the server-confirmed state before revalidation. Navigation should not
// have to wait for a detail fetch or delta sync to see a successful start/pause.
const publishTimerState = async (queryClient, choreId, result) => {
  const id = String(choreId)
  await Promise.all([
    queryClient.cancelQueries({ queryKey: ['chore', id] }),
    queryClient.cancelQueries({ queryKey: ['choreTimer', id] }),
    queryClient.cancelQueries({ queryKey: ['chores'] }),
  ])
  const patch = result.res
  queryClient.setQueriesData({ queryKey: ['chores'] }, data =>
    data?.res
      ? {
          ...data,
          res: data.res.map(chore =>
            String(chore.id) === id ? { ...chore, ...patch } : chore,
          ),
        }
      : data,
  )
  queryClient.setQueryData(['chore', id], data =>
    data?.res ? { ...data, res: { ...data.res, ...patch } } : data,
  )
  // Timer mutations return a summary, not a full session. Only patch an
  // existing session; don't invent an ID or pause log for a new timer.
  queryClient.setQueryData(['choreTimer', id], data =>
    data?.res
      ? {
          ...data,
          res: {
            ...data.res,
            duration: patch.duration,
            updatedAt: patch.timerUpdatedAt,
            status: patch.status === 1 ? 0 : 1,
          },
        }
      : data,
  )
  await refreshTimerQueries(queryClient, id)
}

const timerMutation = async (request, id) => {
  const response = await request(id)
  const data = await response.json()
  if (!response.ok)
    throw new Error(data?.error || 'Failed to update chore timer')
  return data
}

export const useChoreTimer = choreId => {
  return useQuery({
    queryKey: ['choreTimer', String(choreId)],
    queryFn: async () => {
      if (!choreId) throw new Error('Chore ID is required to fetch timer')
      const response = await GetChoreTimer(choreId)
      if (response && response.ok) return await response.json()
      if (response?.status === 404) return { res: null }
      throw new Error('Failed to fetch chore timer')
    },
    enabled: !!choreId,
  })
}

export const useStartChore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: id => timerMutation(StartChore, id),
    onSuccess: (data, id) => publishTimerState(queryClient, id, data),
  })
}

export const usePauseChore = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: id => timerMutation(PauseChore, id),
    onSuccess: (data, id) => publishTimerState(queryClient, id, data),
  })
}

export const useUpdateTimeSession = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ choreId, sessionData, sessionId }) =>
      (await UpdateTimeSession(choreId, sessionId, sessionData)).json(),
    onSuccess: (_, { choreId }) => refreshTimerQueries(queryClient, choreId),
  })
}

export const useDeleteTimeSession = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ choreId, sessionId }) =>
      (await DeleteTimeSession(choreId, sessionId)).json(),
    onSuccess: (_, { choreId }) => refreshTimerQueries(queryClient, choreId),
  })
}

export const useResetChoreTimer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: id => timerMutation(ResetChoreTimer, id),
    onSuccess: (data, id) => publishTimerState(queryClient, id, data),
  })
}

export const useClearChoreTimer = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ClearChoreTimer,
    onSuccess: (_, choreId) => refreshTimerQueries(queryClient, choreId),
  })
}

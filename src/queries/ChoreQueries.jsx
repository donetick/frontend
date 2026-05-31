import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { networkManager } from '../hooks/NetworkManager'
import { commandQueue, CommandType } from '../utils/CommandQueue'
import {
  ApproveChore,
  ArchiveChore,
  CreateChore,
  DeleteChore,
  DeleteChoreHistory,
  GetChoreByID,
  GetChoreDetailById,
  GetChoreHistory,
  GetChoresHistory,
  GetChoresNew,
  MarkChoreComplete,
  RejectChore,
  SaveChore,
  SkipChore,
  UnArchiveChore,
  UpdateChoreHistory,
} from '../utils/Fetcher'
import { offlineDB } from '../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../utils/OfflineFeatureToggle'
import { syncEngine } from '../utils/SyncEngine'

const mergePendingCreates = async chores => {
  const pending = await commandQueue.getPending()
  const pendingCreates = pending.filter(
    cmd => cmd.commandType === CommandType.CREATE_CHORE,
  )
  const deletedIds = new Set(
    pending
      .filter(cmd => cmd.commandType === CommandType.DELETE_CHORE)
      .map(cmd => String(cmd.entityId)),
  )

  if (pendingCreates.length === 0) return chores

  const existingIds = new Set((chores || []).map(chore => String(chore.id)))
  const createdFromQueue = pendingCreates
    .filter(
      cmd =>
        !existingIds.has(String(cmd.entityId)) &&
        !deletedIds.has(String(cmd.entityId)),
    )
    .map(cmd => {
      const payload = cmd.payload || {}
      return {
        ...payload,
        id: cmd.entityId,
        nextDueDate: payload.nextDueDate || payload.dueDate || null,
        _pendingCreate: true,
      }
    })

  return [...(chores || []), ...createdFromQueue]
}

const isNetworkError = error =>
  error instanceof TypeError && error.message === 'Failed to fetch'

const buildOfflineChore = task => ({
  ...task,
  id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
  nextDueDate: task.nextDueDate || task.dueDate || null,
  _pendingCreate: true,
})

export const useChores = (includeArchive = false) => {
  return useQuery({
    queryKey: ['chores', includeArchive],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      if (isOfflineFeatureEnabled()) {
        // Sync from server first (no-op if already syncing or offline)
        if (networkManager.isOnline) {
          await syncEngine.sync()
        }
        const cursor = await offlineDB.getSyncCursor()
        if (cursor > 0) {
          const cached = await offlineDB.getChores(includeArchive)
          const merged = await mergePendingCreates(cached || [])
          return { res: merged }
        }
      }

      // Offline feature disabled — fetch from API.
      try {
        const data = await GetChoresNew(includeArchive)
        if (data?.res) {
          syncEngine.cacheChores(data.res)
        }
        const merged = await mergePendingCreates(data?.res || [])
        return { ...data, res: merged }
      } catch {
        // API failed — fall back to whatever is in the cache
        const cached = await offlineDB.getChores(includeArchive)
        const merged = await mergePendingCreates(cached || [])
        if (merged && merged.length > 0) {
          return { res: merged }
        }
        throw new Error(
          'Unable to communicate with server and no data available',
        )
      }
    },
  })
}
export const useDeleteChores = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async choreIds => {
      if (!networkManager.isOnline) {
        await offlineDB.deleteChores(choreIds)
        await Promise.all(
          choreIds.map(async id => {
            await commandQueue.enqueue(CommandType.DELETE_CHORE, id, { id })
          }),
        )

        const removeDeletedChores = oldData => {
          if (!oldData?.res) return oldData

          const deletedIds = new Set(choreIds.map(id => String(id)))
          return {
            ...oldData,
            res: oldData.res.filter(chore => !deletedIds.has(String(chore.id))),
          }
        }

        queryClient.setQueryData(['chores', false], removeDeletedChores)
        queryClient.setQueryData(['chores', true], removeDeletedChores)
        return
      }
      await Promise.all(
        choreIds.map(async id => {
          const resp = await DeleteChore(id)
          if (!resp || !resp.ok) {
            throw new Error(`Failed to delete chore with ID: ${id}`)
          }
        }),
      )
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}
export const useCreateChore = () => {
  const queryClient = useQueryClient()

  const queueOfflineCreate = async newTask => {
    const offlineChore = buildOfflineChore(newTask)
    await commandQueue.enqueue(
      CommandType.CREATE_CHORE,
      offlineChore.id,
      newTask,
    )

    queryClient.setQueryData(['chores', false], oldData => {
      if (!oldData?.res) {
        return { res: [offlineChore] }
      }

      const alreadyExists = oldData.res.some(
        chore => String(chore.id) === String(offlineChore.id),
      )
      if (alreadyExists) return oldData

      return { ...oldData, res: [...oldData.res, offlineChore] }
    })

    return offlineChore
  }

  return useMutation({
    mutationFn: async newTask => {
      if (!networkManager.isOnline) {
        return queueOfflineCreate(newTask)
      }

      try {
        const resp = await CreateChore(newTask)
        if (!resp || !resp.ok) {
          throw new Error('Failed to create chore')
        }
        const createdChore = await resp.json()
        if (!createdChore) {
          throw new Error('Failed to get created chore data')
        }
        return { ...newTask, id: createdChore.res }
      } catch (error) {
        if (isNetworkError(error)) {
          return queueOfflineCreate(newTask)
        }
        throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}

export const useUpdateChore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async updatedChore => {
      const queueOfflineUpdate = async () => {
        await commandQueue.enqueue(
          CommandType.UPDATE_CHORE,
          updatedChore.id,
          updatedChore,
        )
        const pendingChore = { ...updatedChore, _pendingUpdate: true }
        // Persist to offline DB so cache fallback reads the updated data
        await offlineDB.saveChores([pendingChore])
        queryClient.setQueryData(['chores', false], oldData => {
          if (!oldData) return { res: [pendingChore] }
          return {
            res: oldData.res.map(chore =>
              chore.id === updatedChore.id ? pendingChore : chore,
            ),
          }
        })
        queryClient.setQueryData(['chore', updatedChore.id], oldData => {
          if (!oldData) return { res: pendingChore }
          return { ...oldData, res: pendingChore }
        })
        return pendingChore
      }

      try {
        const resp = await SaveChore(updatedChore)
        if (!resp || !resp.ok) {
          throw new Error('Failed to save chore')
        }
        const updatedChoreRes = await resp.json()
        if (!updatedChoreRes) {
          throw new Error('Failed to get updated chore data')
        }
        queryClient.setQueryData(['chores', false], oldData => {
          if (!oldData) return { res: [updatedChore] }
          return {
            res: oldData.res.map(chore =>
              chore.id === updatedChore.id ? updatedChore : chore,
            ),
          }
        })
        return updatedChoreRes?.res || updatedChore
      } catch (error) {
        if (isNetworkError(error)) {
          return queueOfflineUpdate()
        }
        throw error
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['choreHistory', variables.id])
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}

export const useChoresHistory = (initialLimit, includeMembers) => {
  const [limit, setLimit] = useState(initialLimit) // Initially, no limit is selected

  const { data, error, isLoading } = useQuery({
    queryKey: ['choresHistory', limit],
    queryFn: async () => {
      try {
        const resp = await GetChoresHistory(limit, includeMembers)
        const entries = resp?.res || []
        // Cache for offline use — fire-and-forget so a cache failure never
        // degrades the online experience
        if (entries.length > 0) {
          offlineDB
            .saveHistory(entries)
            .catch(err => console.error('Failed to cache chores history:', err))
        }
        return entries
      } catch {
        return offlineDB.getHistoryByDays(limit)
      }
    },
    staleTime: 0,
  })

  const handleLimitChange = newLimit => {
    setLimit(newLimit)
  }

  return { data, error, isLoading, handleLimitChange }
}

export const useChoreDetails = choreId => {
  return useQuery({
    queryKey: ['choreDetails', choreId],
    refetchOnWindowFocus: true,
    queryFn: async () => {
      try {
        const response = await GetChoreDetailById(choreId)
        if (response && response.ok) {
          return await response.json()
        }
        throw new Error('Failed to fetch chore detail')
      } catch {
        // Fall back to cached chore (without timer details)
        const cached = await offlineDB.getChore(choreId)
        if (cached) {
          return { res: cached }
        }
        throw new Error('Chore detail not available offline')
      }
    },
  })
}

export const useChore = choreId => {
  const queryClient = useQueryClient()

  return useQuery({
    queryKey: ['chore', choreId],
    queryFn: async () => {
      if (!choreId) {
        throw new Error('Chore ID is required to fetch chore details')
      }

      try {
        const response = await GetChoreByID(choreId)
        if (response && response.ok) {
          return await response.json()
        }
        throw new Error('Failed to fetch chore')
      } catch {
        // API failed — try offline cache
        const cached = await offlineDB.getChore(choreId)
        if (cached) {
          return { res: cached }
        }
        throw new Error('Chore not available offline')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores'])
    },
  })
}

export const useArchiveChore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ArchiveChore,
    onSuccess: () => {
      queryClient.invalidateQueries(['chores'])
    },
  })
}

export const useUnArchiveChore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: UnArchiveChore,
    onSuccess: () => {
      queryClient.invalidateQueries(['chores'])
    },
  })
}

export const useChoreHistory = choreId => {
  return useQuery({
    queryKey: ['choreHistory', choreId],
    queryFn: async () => {
      if (!choreId) {
        throw new Error('Chore ID is required to fetch history')
      }
      let json
      try {
        const response = await GetChoreHistory(choreId)
        if (response && response.ok) {
          json = await response.json()
        } else {
          throw new Error('Failed to fetch chore history')
        }
      } catch {
        const cached = await offlineDB.getHistoryByChore(choreId)
        return { res: cached }
      }
      // Cache for offline use — fire-and-forget so a cache failure never
      // degrades the online view. Inject choreId since the single-chore
      // endpoint may omit it from each entry.
      const entries = (json?.res || []).map(e =>
        e.choreId != null ? e : { ...e, choreId: Number(choreId) },
      )
      if (entries.length > 0) {
        offlineDB
          .saveHistory(entries)
          .catch(err => console.error('Failed to cache chore history:', err))
      }
      return json
    },
    enabled: !!choreId,
    staleTime: 0, // Always consider data stale
    cacheTime: 0, // Don't cache the data
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: true, // Refetch when window gains focus
  })
}

export const useUpdateChoreHistory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ choreId, historyId, historyData }) => {
      const applyOptimisticUpdate = async () => {
        queryClient.setQueryData(['choreHistory', choreId], oldData => {
          if (!oldData?.res) return oldData
          return {
            ...oldData,
            res: oldData.res.map(entry =>
              entry.id === historyId
                ? { ...entry, ...historyData, _pendingUpdate: true }
                : entry,
            ),
          }
        })
        await offlineDB.updateHistoryEntry(choreId, historyId, {
          ...historyData,
          _pendingUpdate: true,
        })
        return { queued: true }
      }

      if (!networkManager.isOnline) {
        await commandQueue.enqueue(
          CommandType.UPDATE_CHORE_HISTORY,
          `${choreId}:${historyId}`,
          { choreId, historyId, historyData },
        )
        return applyOptimisticUpdate()
      }

      try {
        const response = await UpdateChoreHistory(
          choreId,
          historyId,
          historyData,
        )
        if (!response || !response.ok) {
          throw new Error('Failed to update chore history')
        }
        return response
      } catch (error) {
        if (isNetworkError(error)) {
          await commandQueue.enqueue(
            CommandType.UPDATE_CHORE_HISTORY,
            `${choreId}:${historyId}`,
            { choreId, historyId, historyData },
          )
          return applyOptimisticUpdate()
        }
        throw error
      }
    },
    onSuccess: (data, { choreId }) => {
      if (!data?.queued) {
        queryClient.invalidateQueries(['choreHistory', choreId])
      }
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}

export const useDeleteChoreHistory = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ choreId, historyId }) => {
      const applyOptimisticDelete = async () => {
        queryClient.setQueryData(['choreHistory', choreId], oldData => {
          if (!oldData?.res) return oldData
          return {
            ...oldData,
            res: oldData.res.map(entry =>
              entry.id === historyId
                ? { ...entry, _pendingDelete: true }
                : entry,
            ),
          }
        })
        await offlineDB.updateHistoryEntry(choreId, historyId, {
          _pendingDelete: true,
        })
        return { queued: true }
      }

      if (!networkManager.isOnline) {
        await commandQueue.enqueue(
          CommandType.DELETE_CHORE_HISTORY,
          `${choreId}:${historyId}`,
          { choreId, historyId },
        )
        return applyOptimisticDelete()
      }

      try {
        const response = await DeleteChoreHistory(choreId, historyId)
        if (!response || !response.ok) {
          throw new Error('Failed to delete chore history')
        }
        return response
      } catch (error) {
        if (isNetworkError(error)) {
          await commandQueue.enqueue(
            CommandType.DELETE_CHORE_HISTORY,
            `${choreId}:${historyId}`,
            { choreId, historyId },
          )
          return applyOptimisticDelete()
        }
        throw error
      }
    },
    onSuccess: (data, { choreId }) => {
      if (!data?.queued) {
        queryClient.invalidateQueries(['choreHistory', choreId])
      }
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}

export const useMarkChoreComplete = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ choreId, body, completedDate, performer }) => {
      if (!networkManager.isOnline) {
        await commandQueue.enqueue(CommandType.COMPLETE_CHORE, choreId, {
          id: choreId,
          body,
          completedDate,
          performer,
        })
        await offlineDB.savePendingHistory({
          id: -Date.now(),
          choreId: Number(choreId),
          completedBy: body?.completedBy || 0,
          performedAt: completedDate || new Date().toISOString(),
          notes: body?.note || null,
          status: 1,
          points: 0,
          pending: true,
        })
        // Optimistically update the cache to show pending state
        queryClient.setQueryData(['chores'], oldData => {
          if (!oldData) return oldData
          return {
            res: oldData.res.map(chore =>
              chore.id === choreId ? { ...chore, _pending: 'complete' } : chore,
            ),
          }
        })
        return { res: { _pending: 'complete' } }
      }
      return MarkChoreComplete(choreId, body, completedDate, performer)
    },
    onSuccess: (_, { choreId }) => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['choreHistory', choreId])
      queryClient.invalidateQueries(['choreDetails', choreId])
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}

export const useSkipChore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async choreId => {
      if (!networkManager.isOnline) {
        await commandQueue.enqueue(CommandType.SKIP_CHORE, choreId, {
          id: choreId,
        })
        // Optimistically update the cache to show pending state
        queryClient.setQueryData(['chores'], oldData => {
          if (!oldData) return oldData
          return {
            res: oldData.res.map(chore =>
              chore.id === choreId ? { ...chore, _pending: 'skip' } : chore,
            ),
          }
        })
        return { res: { _pending: 'skip' } }
      }
      return SkipChore(choreId)
    },
    onSuccess: (_, choreId) => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['choreHistory', choreId])
      queryClient.invalidateQueries(['choreDetails', choreId])
      queryClient.invalidateQueries(['pendingCommands'])
    },
  })
}

export const useApproveChore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ApproveChore,
    onSuccess: (_, choreId) => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['choreHistory', choreId])
      queryClient.invalidateQueries(['choreDetails', choreId])
    },
  })
}

export const useRejectChore = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: RejectChore,
    onSuccess: (_, choreId) => {
      queryClient.invalidateQueries(['chores'])
      queryClient.invalidateQueries(['choreHistory', choreId])
      queryClient.invalidateQueries(['choreDetails', choreId])
    },
  })
}

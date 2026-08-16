import { useMutation, useQueryClient } from '@tanstack/react-query'

import { networkManager } from '../hooks/NetworkManager'
import { CompleteSubTask, SaveChore } from '../utils/Fetcher'

export const useUpdate = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async updatedChore => {
      const resp = await SaveChore(updatedChore)
      if (!resp || !resp.ok) {
        throw new Error('Failed to save chore')
      }
      const updatedChoreRes = await resp.json()
      if (!updatedChoreRes) {
        throw new Error('Failed to get updated chore data')
      }
      // Successfully updated the chore on the server, return the updated chore
      return updatedChoreRes?.res || updatedChoreRes
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['chores'])
    },
  })
}

export const useCompleteSubTask = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (subTaskId, choreId, completedAt) => {
      if (!networkManager.isOnline) {
        throw new Error('Cannot complete subtask while offline')
      }
      const resp = await CompleteSubTask(subTaskId, choreId, completedAt)
      if (!resp || !resp.ok) {
        throw new Error('Failed to complete subtask')
      }
      const result = await resp.json()
      if (!result || !result.res) {
        throw new Error('Failed to get completed subtask data')
      }
      return result.res
    },
    onSuccess: (data, variables) => {},
  })
}

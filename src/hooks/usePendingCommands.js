import { useQuery } from '@tanstack/react-query'

import { commandQueue } from '../utils/CommandQueue'

// Hook to get pending commands for a specific chore (for showing pending badges/undo)
export const usePendingCommands = choreId => {
  return useQuery({
    queryKey: ['pendingCommands', choreId],
    queryFn: () => commandQueue.getPendingForEntity(String(choreId)),
    refetchInterval: 2000, // Poll since commands change outside React
    staleTime: 0,
  })
}

// Hook to get all pending command count (for sync indicator)
export const usePendingCommandCount = () => {
  return useQuery({
    queryKey: ['pendingCommands', 'all'],
    queryFn: async () => {
      const cmds = await commandQueue.getPending()
      return cmds.length
    },
    refetchInterval: 3000,
    staleTime: 0,
  })
}

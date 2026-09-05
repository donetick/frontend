import { useQuery } from '@tanstack/react-query'
import { useCallback } from 'react'

import { commandQueue } from '../utils/CommandQueue'

// Stable identity so cards with nothing pending don't see a new array each poll
const NO_COMMANDS = []

// A single query backs every pending-command consumer in the app. Each card
// used to run its own polling query, so a 100-task list meant 100 concurrent
// reads of the command store every 2 seconds; now they all read one result and
// select their own slice out of it. Structural sharing keeps `data` referentially
// stable while nothing changes, so an idle queue causes no re-renders at all.
const usePendingCommandsQuery = select =>
  useQuery({
    queryKey: ['pendingCommands', 'byEntity'],
    queryFn: () => commandQueue.getPendingGroupedByEntity(),
    refetchInterval: 2000, // Poll since commands change outside React
    staleTime: 0,
    select,
  })

// Hook to get pending commands for a specific chore (for showing pending badges/undo)
export const usePendingCommands = choreId => {
  const select = useCallback(
    grouped => grouped?.[String(choreId)] ?? NO_COMMANDS,
    [choreId],
  )
  return usePendingCommandsQuery(select)
}

// Hook to get all pending command count (for sync indicator)
export const usePendingCommandCount = () => {
  const select = useCallback(
    grouped =>
      Object.values(grouped ?? {}).reduce(
        (total, cmds) => total + cmds.length,
        0,
      ),
    [],
  )
  return usePendingCommandsQuery(select)
}

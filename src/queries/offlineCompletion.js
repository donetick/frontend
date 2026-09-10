/**
 * Local completion/skip for the existing offline cache.
 *
 * Before this existed, completing a recurring chore while offline only painted
 * a `_pending` badge — the due date did not move, so the task looked broken
 * until the device came back online. These helpers run the ported domain logic
 * (`src/domain/*`) against the cached chore so the UI advances exactly the way
 * the server would, while the command queue still replays the real request
 * later.
 *
 * The server remains authoritative: when the queued command syncs, the delta
 * pull overwrites whatever we computed here.
 */

import {
  HISTORY_STATUS,
  tryCompleteChore,
  trySkipChore,
} from '../domain/completion'
import { offlineDB } from '../utils/OfflineDB'

/** The chore as the offline cache currently knows it. */
const loadCachedChore = async (queryClient, choreId) => {
  try {
    const cached = await offlineDB.getChore(choreId)
    if (cached) return cached
  } catch (err) {
    console.warn('Could not read cached chore for local completion', err)
  }

  // Fall back to whatever a chore list already holds in the query cache.
  const lists = queryClient.getQueriesData({ queryKey: ['chores'] })
  for (const [, data] of lists) {
    const found = data?.res?.find?.(
      chore => String(chore.id) === String(choreId),
    )
    if (found) return found
  }
  return null
}

const loadCachedHistory = async choreId => {
  try {
    return (await offlineDB.getHistoryByChore(choreId)) || []
  } catch {
    return []
  }
}

/** Push the locally advanced chore into every cached chore list and detail. */
const applyChoreToCaches = async (queryClient, choreId, chore) => {
  await offlineDB.saveChores([chore])

  queryClient.setQueriesData({ queryKey: ['chores'] }, oldData => {
    if (!oldData?.res) return oldData
    return {
      ...oldData,
      res: oldData.res.map(candidate =>
        String(candidate.id) === String(choreId) ? chore : candidate,
      ),
    }
  })

  queryClient.setQueriesData(
    { queryKey: ['choreDetails', choreId] },
    oldData => {
      if (!oldData?.res) return oldData
      return { ...oldData, res: { ...oldData.res, ...chore } }
    },
  )
}

/**
 * Advance a chore locally for a completion.
 *
 * @returns the updated chore, or null when nothing could be computed (unknown
 *   chore, unschedulable frequency) — callers fall back to the `_pending` badge.
 */
export const applyLocalCompletion = async ({
  choreId,
  completedBy = 0,
  completedDate,
  note = null,
  queryClient,
}) => {
  const cached = await loadCachedChore(queryClient, choreId)
  if (!cached) return null

  const history = await loadCachedHistory(choreId)
  const result = tryCompleteChore({
    chore: cached,
    completedDate,
    history,
    note,
    completedBy,
  })
  if (!result) return null

  const chore = { ...result.chore, _pending: 'complete' }
  await applyChoreToCaches(queryClient, choreId, chore)
  await offlineDB.savePendingHistory({
    ...result.historyEntry,
    choreId: Number(choreId),
    pending: true,
  })

  return chore
}

/** Advance a chore locally for a skip. Same contract as `applyLocalCompletion`. */
export const applyLocalSkip = async ({
  choreId,
  queryClient,
  skippedBy = 0,
}) => {
  const cached = await loadCachedChore(queryClient, choreId)
  if (!cached) return null

  const result = trySkipChore({ chore: cached, skippedBy })
  if (!result) return null

  const chore = { ...result.chore, _pending: 'skip' }
  await applyChoreToCaches(queryClient, choreId, chore)
  await offlineDB.savePendingHistory({
    ...result.historyEntry,
    choreId: Number(choreId),
    status: HISTORY_STATUS.SKIPPED,
    pending: true,
  })

  return chore
}

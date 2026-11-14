import { hydrateQueriesFromOfflineCache } from '../queries/OfflineHydration'
import { queryClient } from '../queries/QueryClient'
import { offlineDB } from './OfflineDB'
import { clearAllTokens, saveTokens } from './TokenStorage'

// Only session boundaries restore the cache, never individual query mounts.
// Wait for essentials; optional metadata continues independently.
export const restoreSession = () =>
  hydrateQueriesFromOfflineCache(queryClient, { criticalOnly: true }).catch(
    err => console.error('Failed to restore offline session', err),
  )

export const clearSession = async () => {
  // Invalidate the session first so pending hydration cannot seed old data.
  await clearAllTokens()
  await queryClient.cancelQueries()
  queryClient.clear()
  await offlineDB.clearAll()
}

// Explicit login (password, OAuth, or MFA) establishes a new session.
// Token refresh intentionally uses saveTokens directly, retaining cached data.
export const startSession = async tokens => {
  await clearSession()
  await saveTokens(tokens)
  await restoreSession()
}

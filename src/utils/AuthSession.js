import { hydrateQueriesFromOfflineCache } from '../queries/OfflineHydration'
import { queryClient } from '../queries/QueryClient'
import { offlineDB } from './OfflineDB'
import { clearAllTokens, saveTokens } from './TokenStorage'

// Give cached essentials a chance to restore before mounting, but a wedged
// database must not hold the app shell indefinitely. Late reads may still seed
// missing data; hydration guards against overwrites and session changes.
export const restoreSession = async () => {
  let timeout
  try {
    await Promise.race([
      hydrateQueriesFromOfflineCache(queryClient),
      new Promise(resolve => {
        timeout = setTimeout(resolve, 1500)
      }),
    ])
  } catch (err) {
    console.error('Failed to restore offline session', err)
  } finally {
    clearTimeout(timeout)
  }
}

export class SessionStorageError extends Error {
  constructor(cause) {
    super("Couldn't clear local data. Please try signing in again.", { cause })
    this.name = 'SessionStorageError'
  }
}

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
  try {
    await clearSession()
  } catch (err) {
    throw new SessionStorageError(err)
  }
  // Storage was just emptied: there is nothing to hydrate after a new login.
  await saveTokens(tokens)
}

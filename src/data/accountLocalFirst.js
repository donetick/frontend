// Phase 4 rollout flag (see docs/offline-first-phase4-plan.md §4). Gates the
// new account-mode local-first sync path (src/sync/accountSync.js) behind an
// opt-in switch, distinct from OfflineFeatureToggle.js's flag (which governs
// the *old* CommandQueue/SyncEngine/OfflineDB path and defaults on). This one
// defaults OFF: flipping it on is what puts a signed-in account through the
// new engine instead of the legacy one, so a broken rollout can't silently
// affect existing logged-in users.
import { isLocalMode } from './appMode'

const ACCOUNT_LOCAL_FIRST_KEY = 'account_local_first_enabled'
const ACCOUNT_LOCAL_FIRST_EVENT = 'donetick:account-local-first-changed'

const parseBoolean = value => {
  if (value === null || typeof value === 'undefined') return false
  try {
    return JSON.parse(value) === true
  } catch {
    return false
  }
}

export const isAccountLocalFirstEnabled = () => {
  if (typeof window === 'undefined' || !window.localStorage) return false
  return parseBoolean(window.localStorage.getItem(ACCOUNT_LOCAL_FIRST_KEY))
}

export const setAccountLocalFirstEnabled = enabled => {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(
    ACCOUNT_LOCAL_FIRST_KEY,
    JSON.stringify(!!enabled),
  )
  window.dispatchEvent(
    new CustomEvent(ACCOUNT_LOCAL_FIRST_EVENT, {
      detail: { enabled: !!enabled },
    }),
  )
}

// Use only to decide whether a write should go through the local repository
// first — not for capability gating, routing, or auth checks, which must
// keep reading `isLocalMode()`/token presence directly.
export const shouldUseLocalFirstStore = () =>
  isLocalMode() || isAccountLocalFirstEnabled()

export const subscribeToAccountLocalFirst = callback => {
  if (typeof window === 'undefined') return () => {}

  const handleToggle = event => {
    if (event?.type === 'storage') {
      if (event.key !== ACCOUNT_LOCAL_FIRST_KEY) return
      callback(parseBoolean(event.newValue))
      return
    }

    callback(!!event?.detail?.enabled)
  }

  window.addEventListener(ACCOUNT_LOCAL_FIRST_EVENT, handleToggle)
  window.addEventListener('storage', handleToggle)

  return () => {
    window.removeEventListener(ACCOUNT_LOCAL_FIRST_EVENT, handleToggle)
    window.removeEventListener('storage', handleToggle)
  }
}

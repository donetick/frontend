import { useCallback, useSyncExternalStore } from 'react'

import {
  APP_MODES,
  capabilitiesFor,
  getAppMode,
  subscribeToAppMode,
} from '../data/appMode'

const subscribe = callback => subscribeToAppMode(callback)

/**
 * The current app mode, re-rendering when it changes (including from another
 * tab).
 */
export const useAppMode = () =>
  useSyncExternalStore(subscribe, getAppMode, () => null)

/**
 * What the current mode supports.
 *
 *   const { can, isLocal } = useCapabilities()
 *   if (!can('points')) return null
 *
 * Gating on a capability rather than on the mode itself is what lets Phase 4
 * re-enable account-only features from one place.
 */
export const useCapabilities = () => {
  const mode = useAppMode()
  const capabilities = capabilitiesFor(mode)

  const can = useCallback(
    capability => Boolean(capabilitiesFor(mode)[capability]),
    [mode],
  )

  return {
    mode,
    capabilities,
    can,
    isLocal: mode === APP_MODES.LOCAL,
    isAccount: mode === APP_MODES.ACCOUNT,
  }
}

export default useCapabilities

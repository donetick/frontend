import { App as capacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { isAccountLocalFirstEnabled } from '../data/accountLocalFirst'
import { isLocalMode } from '../data/appMode'
import { ensureLocalStoreReady } from '../data/health'
import { sync as accountSync } from '../sync/accountSync'
import { isOAuthExchangeInProgress } from '../utils/OAuthExchangeState'
import { networkManager } from './NetworkManager'

export const PENDING_POLL_MS = 30_000 // retry pending pushes every 30s
const CACHE_REFRESH_MS = 5 * 60_000 // pull fresh server state every 5 min while online
const SERVER_PROBE_MS = 15_000 // probe server when marked unreachable but device has network

/**
 * Phase 4 counterpart to `useSyncOnReconnect` (see
 * `docs/offline-first-phase4-step3-plan.md` §3.6): mirrors the same trigger
 * set, but drives `accountSync.sync()` instead of the legacy
 * `syncEngine.sync()`. Both hooks are mounted unconditionally from
 * `AppContent` — each no-ops based on its own flag, so only one ever
 * actually runs for a given user.
 */
export function useAccountSyncOnReconnect() {
  const queryClient = useQueryClient()
  const initialized = useRef(false)

  useEffect(() => {
    let pollInterval
    let cacheRefreshInterval
    let serverProbeInterval
    let resumeListener
    let networkListener

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync()
      }
    }

    const handleOnline = () => runSync()

    const runSync = async () => {
      if (isLocalMode() || !isAccountLocalFirstEnabled()) return
      if (!localStorage.getItem('token')) return
      // Same reasoning as useSyncOnReconnect: a sync mid-OAuth-exchange has
      // no session yet and would just 401.
      if (isOAuthExchangeInProgress()) return

      const result = await accountSync()
      if (result) queryClient.invalidateQueries()
    }

    const init = async () => {
      if (initialized.current) return
      initialized.current = true

      // The local document store backs account-mode local-first reads/writes
      // too, so it has to be open before accountSync can touch it. App.jsx's
      // isLocalMode()-gated effect opens it for local mode; this covers the
      // account-mode-with-flag-on case.
      if (isAccountLocalFirstEnabled() && !isLocalMode()) {
        await ensureLocalStoreReady()
      }

      networkListener = async isOnline => {
        if (isOnline) await runSync()
      }
      networkManager.registerNetworkListener(networkListener)

      document.addEventListener('visibilitychange', handleVisibilityChange)
      window.addEventListener('online', handleOnline)

      if (Capacitor.isNativePlatform()) {
        resumeListener = await capacitorApp.addListener(
          'appStateChange',
          ({ isActive }) => {
            if (isActive) runSync()
          },
        )
      }

      pollInterval = setInterval(runSync, PENDING_POLL_MS)
      cacheRefreshInterval = setInterval(runSync, CACHE_REFRESH_MS)
      serverProbeInterval = setInterval(() => {
        if (!networkManager.isOnline && networkManager.deviceOnline) {
          runSync()
        }
      }, SERVER_PROBE_MS)
    }

    init()

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (cacheRefreshInterval) clearInterval(cacheRefreshInterval)
      if (serverProbeInterval) clearInterval(serverProbeInterval)
      if (networkListener)
        networkManager.unregisterNetworkListener(networkListener)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      resumeListener?.remove()
    }
  }, [queryClient])
}

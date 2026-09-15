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

export const PENDING_POLL_MS = 30_000 // one full pull+push cycle every 30s while online
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

      try {
        const result = await accountSync()
        if (result) queryClient.invalidateQueries()
      } catch (err) {
        // A setInterval/event-listener callback has no caller to reject to;
        // an uncaught rejection here would surface as an unhandled rejection
        // instead of just failing this cycle (retried next tick/interval).
        console.warn('accountSync.sync() failed', err)
      }
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

      // Run the initial pull immediately — without this, a newly enabled
      // account store renders no chores until the first 30s poll fires (see
      // docs/offline-first-review.md finding 5).
      await runSync()

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

      // One full pull+push cycle on a single cadence — the pull is already a
      // cheap delta fetch (`/sync/changes?since=cursor`) and the push is a
      // no-op when nothing is dirty, so a second, slower interval doing the
      // identical `sync()` call added no distinct behavior (finding 5).
      pollInterval = setInterval(runSync, PENDING_POLL_MS)
      serverProbeInterval = setInterval(() => {
        if (!networkManager.isOnline && networkManager.deviceOnline) {
          runSync()
        }
      }, SERVER_PROBE_MS)
    }

    init()

    return () => {
      if (pollInterval) clearInterval(pollInterval)
      if (serverProbeInterval) clearInterval(serverProbeInterval)
      if (networkListener)
        networkManager.unregisterNetworkListener(networkListener)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      resumeListener?.remove()
    }
  }, [queryClient])
}

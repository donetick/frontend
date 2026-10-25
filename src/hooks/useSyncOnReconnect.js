import { App as capacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'

import { commandQueue } from '../utils/CommandQueue'
import { isOAuthExchangeInProgress } from '../utils/OAuthExchangeState'
import { offlineDB } from '../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../utils/OfflineFeatureToggle'
import { syncEngine } from '../utils/SyncEngine'
import { networkManager } from './NetworkManager'

export const PENDING_POLL_MS = 30_000 // retry pending commands every 30s
export const SERVER_PROBE_MS = 15_000 // probe server when marked unreachable but device has network
const CACHE_REFRESH_MS = 5 * 60_000 // refresh IDB cache every 5 min while online

export function useSyncOnReconnect() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let retryTimer
    let armGeneration = 0
    let stopped = false
    let resumeListener
    let networkListener
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        runSync()
      }
    }

    const handleOnline = () => runSync()

    const init = async () => {
      // No re-entrancy guard: the effect's deps are stable, so it runs once in
      // production, and the cleanup below undoes everything it sets up. A
      // "already initialized" flag would survive StrictMode's remount in dev
      // and leave the second instance with no listeners and no retry loop at
      // all — a dev-only dead scheduler that hid real behaviour.
      if (isOfflineFeatureEnabled()) {
        await offlineDB.init()
      }
      // The effect may have been cleaned up while the database was opening
      // (notably during StrictMode's setup/cleanup probe).
      if (stopped) return

      // 1. Device network change (works on native + real network drops)
      // Fires in both directions: coming back needs a sync, and dropping out
      // changes the cadence (probe vs. idle heartbeat). runSync does the right
      // thing for either case and re-arms the scheduler itself.
      networkListener = () => runSync()
      networkManager.registerNetworkListener(networkListener)

      // 2. Tab becomes visible (user switches back to the tab after reconnecting backend)
      document.addEventListener('visibilitychange', handleVisibilityChange)

      // 3. Browser online event (fires when device network is restored)
      window.addEventListener('online', handleOnline)

      // 3.5 Native app resume (fires when returning to the foreground)
      if (Capacitor.isNativePlatform()) {
        resumeListener = await capacitorApp.addListener(
          'appStateChange',
          ({ isActive }) => {
            if (isActive) {
              console.log(
                'App resumed, checking connectivity and syncing if online...',
              )
              runSync()
            }
          },
        )
        // Cleanup can also land while Capacitor is installing the listener.
        // In that case cleanup could not see the handle, so remove it here.
        if (stopped) {
          resumeListener.remove()
          return
        }
      }

      // 4. Start the single retry loop (see armRetry)
      armRetry()
    }

    // How long until the next automatic attempt is worth making, or null when
    // there is nothing to wait for.
    const nextRetryDelay = async () => {
      if (!isOfflineFeatureEnabled()) return null
      // Without device network nothing can be replayed or fetched. Keep a slow
      // heartbeat anyway (runSync bails before issuing any request, so it costs
      // nothing) so a missed network event can't wedge the loop for good.
      if (!networkManager.deviceOnline) return PENDING_POLL_MS
      // Server marked unreachable — probe for its return.
      if (!networkManager.serverReachable) return SERVER_PROBE_MS
      try {
        const pending = await commandQueue.getPending()
        if (pending.length > 0) return PENDING_POLL_MS
      } catch {
        // Queue unreadable (DB not ready) — fall through to the slow cadence.
      }
      // Otherwise just keep the cache warm.
      return CACHE_REFRESH_MS
    }

    // One self-rescheduling timer replaces the three fixed intervals this used
    // to run. They overlapped and drifted independently of each other, so the
    // countdown the UI showed was never the interval that actually fired next
    // — it would sit at 11s and then a different timer would trigger a sync.
    // Publishing the single scheduled timestamp keeps the UI honest, and
    // recomputing the delay each time means the cadence follows the current
    // state (probing, flushing the queue, or just refreshing).
    const armRetry = async () => {
      // Reading the queue to pick a delay is async, so two callers (a sync
      // finishing as a network event lands) can both get past the clear below
      // and leave a stray timer behind — doubling the sync traffic. Only the
      // newest call is allowed to install a timer.
      const generation = ++armGeneration
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = undefined
      }
      if (stopped) return

      const delay = await nextRetryDelay()
      if (stopped || generation !== armGeneration) return
      if (delay === null) {
        syncEngine.setNextRetryAt(null)
        return
      }

      syncEngine.setNextRetryAt(Date.now() + delay)
      retryTimer = setTimeout(() => {
        retryTimer = undefined
        runSync()
      }, delay)
    }

    const canSync = () => {
      if (!isOfflineFeatureEnabled()) return false
      // Public routes (onboarding, login, signup) have no session to sync.
      // Calling /sync/changes here returns 401 and the global auth handler
      // hard-navigates to /login, which reloads the WebView mid-onboarding.
      if (!localStorage.getItem('token')) return false
      // Skip while the OAuth code exchange is in flight — there's no session
      // yet, so a sync here just 401s. Note the app-resume listener fires in
      // the same tick as the deep link, before the route changes, so this has
      // to test the shared flag rather than the pathname.
      if (isOAuthExchangeInProgress()) return false
      // Offline on the device itself: nothing can be replayed or fetched, so
      // don't waste a request (and a timeout) finding that out.
      if (!networkManager.deviceOnline) return false
      return true
    }

    const runSync = async () => {
      try {
        if (!canSync()) return

        const wasOffline = !networkManager.isOnline
        const didSync = await syncEngine.sync()
        if (didSync) {
          queryClient.invalidateQueries()
          // After recovery from server-unreachable, run a second pass to flush
          // any commands that were skipped while offline
          if (wasOffline && networkManager.isOnline) {
            const didSync2 = await syncEngine.sync()
            if (didSync2) queryClient.invalidateQueries()
          }
        }
      } finally {
        // Always reschedule from the end of an attempt, so the countdown the
        // UI shows is the time until the next one — whatever triggered this,
        // and whether or not it was allowed to run.
        armRetry()
      }
    }

    init()

    return () => {
      stopped = true
      if (retryTimer) {
        clearTimeout(retryTimer)
      }
      syncEngine.setNextRetryAt(null)

      if (networkListener) {
        networkManager.unregisterNetworkListener(networkListener)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      resumeListener?.remove()
    }
  }, [queryClient])
}

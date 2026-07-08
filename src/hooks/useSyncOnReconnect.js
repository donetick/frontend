import { App as capacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { commandQueue } from '../utils/CommandQueue'
import { offlineDB } from '../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../utils/OfflineFeatureToggle'
import { syncEngine } from '../utils/SyncEngine'
import { networkManager } from './NetworkManager'

export const PENDING_POLL_MS = 30_000 // retry pending commands every 30s
export const SERVER_PROBE_MS = 15_000 // probe server when marked unreachable but device has network
const CACHE_REFRESH_MS = 5 * 60_000 // refresh IDB cache every 5 min while online

export function useSyncOnReconnect() {
  const queryClient = useQueryClient()
  const initialized = useRef(false)

  useEffect(() => {
    let pendingPollInterval
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

    const init = async () => {
      if (initialized.current) return
      initialized.current = true

      if (isOfflineFeatureEnabled()) {
        await offlineDB.init()
      }

      // 1. Device network change (works on native + real network drops)
      networkListener = async isOnline => {
        if (isOnline) {
          await runSync()
        }
      }
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
      }

      // 4. Retry pending commands every 30s (catches backend restart)
      pendingPollInterval = setInterval(async () => {
        const pending = await commandQueue.getPending()
        if (pending.length > 0) {
          runSync()
        }
      }, PENDING_POLL_MS)

      // 5. Keep IDB cache fresh every 5 min while online (so offline reads are current)
      cacheRefreshInterval = setInterval(() => {
        runSync()
      }, CACHE_REFRESH_MS)

      // 6. Probe server every 15s when server is unreachable but device has network
      serverProbeInterval = setInterval(async () => {
        if (!networkManager.isOnline && networkManager.deviceOnline) {
          await runSync()
        }
      }, SERVER_PROBE_MS)
    }

    const runSync = async () => {
      if (!isOfflineFeatureEnabled()) return
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
    }

    init()

    return () => {
      if (pendingPollInterval) {
        clearInterval(pendingPollInterval)
      }

      if (cacheRefreshInterval) {
        clearInterval(cacheRefreshInterval)
      }

      if (serverProbeInterval) {
        clearInterval(serverProbeInterval)
      }

      if (networkListener) {
        networkManager.unregisterNetworkListener(networkListener)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      resumeListener?.remove()
    }
  }, [queryClient])
}

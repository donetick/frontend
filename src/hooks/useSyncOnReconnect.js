import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { commandQueue } from '../utils/CommandQueue'
import { offlineDB } from '../utils/OfflineDB'
import { isOfflineFeatureEnabled } from '../utils/OfflineFeatureToggle'
import { syncEngine } from '../utils/SyncEngine'
import { networkManager } from './NetworkManager'

const PENDING_POLL_MS = 30_000 // retry pending commands every 30s
const CACHE_REFRESH_MS = 5 * 60_000 // refresh IDB cache every 5 min while online

export function useSyncOnReconnect() {
  const queryClient = useQueryClient()
  const initialized = useRef(false)

  useEffect(() => {
    const init = async () => {
      if (initialized.current) return
      initialized.current = true

      if (isOfflineFeatureEnabled()) {
        await offlineDB.init()
      }

      // 1. Device network change (works on native + real network drops)
      networkManager.registerNetworkListener(async isOnline => {
        if (isOnline) {
          await runSync()
        }
      })

      // 2. Tab becomes visible (user switches back to the tab after reconnecting backend)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          runSync()
        }
      })

      // 3. Browser online event (fires when device network is restored)
      window.addEventListener('online', () => runSync())

      // 4. Retry pending commands every 30s (catches backend restart)
      setInterval(async () => {
        const pending = await commandQueue.getPending()
        if (pending.length > 0) {
          runSync()
        }
      }, PENDING_POLL_MS)

      // 5. Keep IDB cache fresh every 5 min while online (so offline reads are current)
      setInterval(() => {
        runSync()
      }, CACHE_REFRESH_MS)
    }

    const runSync = async () => {
      if (!isOfflineFeatureEnabled()) return
      const didSync = await syncEngine.sync()
      if (didSync) {
        queryClient.invalidateQueries()
      }
    }

    init()
  }, [queryClient])
}

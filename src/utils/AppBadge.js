import { Capacitor } from '@capacitor/core'
import { Badge } from '@capawesome/capacitor-badge'

// Badge.set/clear reject on platforms without permission or support (e.g. web
// outside an installed PWA), so every call here is best-effort.
export const setAppBadgeCount = async count => {
  if (!Capacitor.isNativePlatform()) return

  try {
    if (count > 0) {
      await Badge.set({ count })
    } else {
      await Badge.clear()
    }
  } catch (error) {
    console.error('Error setting app badge count', error)
  }
}

export const clearAppBadge = async () => {
  if (!Capacitor.isNativePlatform()) return

  try {
    await Badge.clear()
  } catch (error) {
    console.error('Error clearing app badge', error)
  }
}

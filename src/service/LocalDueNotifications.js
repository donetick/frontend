/**
 * Due-date notifications scheduled entirely from local data.
 *
 * Account mode gets push notifications from the server. Local mode has no
 * server, so the OS scheduler is the only thing that can remind the user —
 * `@capacitor/local-notifications` takes a list of fire times up front and
 * delivers them without the app running.
 *
 * The whole schedule is rebuilt whenever chores change rather than diffed:
 * a personal task list is small, and reconciling notification ids against a
 * mutable chore list is exactly the kind of bookkeeping that silently rots.
 */

import { isLocalMode } from '../data/appMode'
import { choreRepo } from '../data/repositories/choreRepo'
import { isNativeApp } from '../utils/Onboarding'

// The OS caps how many pending notifications an app may hold (iOS allows 64).
// Staying well under it means the nearest due dates always get a slot.
const MAX_SCHEDULED = 32

// Notification ids are derived from the chore id so a rebuild replaces rather
// than duplicates. Capacitor requires a 32-bit int, hence the hash.
const notificationIdFor = choreId => {
  const key = String(choreId)
  let hash = 0
  for (let i = 0; i < key.length; i++) {
    hash = (hash * 31 + key.charCodeAt(i)) | 0
  }
  // Keep it positive and clear of the reserved 0.
  return (Math.abs(hash) % 2_000_000_000) + 1
}

const loadPlugin = async () => {
  try {
    const { LocalNotifications } =
      await import('@capacitor/local-notifications')
    return LocalNotifications
  } catch {
    return null
  }
}

const hasPermission = async plugin => {
  try {
    const current = await plugin.checkPermissions()
    if (current?.display === 'granted') return true
    const requested = await plugin.requestPermissions()
    return requested?.display === 'granted'
  } catch {
    return false
  }
}

/**
 * Rebuild the pending due-date notifications from the local chore list.
 *
 * @returns {number} how many notifications are now scheduled
 */
export const rescheduleDueNotifications = async () => {
  if (!isLocalMode() || !isNativeApp()) return 0

  const plugin = await loadPlugin()
  if (!plugin) return 0
  if (!(await hasPermission(plugin))) return 0

  try {
    // Clear ours before rescheduling so a deleted or completed chore stops
    // firing. Only notifications this module created are pending on this id
    // space, so cancelling all of them is safe.
    const pending = await plugin.getPending()
    if (pending?.notifications?.length) {
      await plugin.cancel({ notifications: pending.notifications })
    }

    const now = Date.now()
    const chores = await choreRepo.all()

    const upcoming = chores
      .filter(chore => chore.notification !== false)
      .map(chore => ({ chore, at: new Date(chore.nextDueDate ?? 0).getTime() }))
      .filter(entry => Number.isFinite(entry.at) && entry.at > now)
      .sort((a, b) => a.at - b.at)
      .slice(0, MAX_SCHEDULED)

    if (!upcoming.length) return 0

    await plugin.schedule({
      notifications: upcoming.map(({ at, chore }) => ({
        id: notificationIdFor(chore.id),
        title: chore.name,
        body: 'Due now',
        schedule: { at: new Date(at), allowWhileIdle: true },
        extra: { choreId: chore.id },
      })),
    })

    return upcoming.length
  } catch (error) {
    // A notification failure must never break the task list.
    console.warn('Could not schedule local due notifications', error)
    return 0
  }
}

/** Remove every notification this module scheduled. */
export const cancelDueNotifications = async () => {
  const plugin = await loadPlugin()
  if (!plugin) return
  try {
    const pending = await plugin.getPending()
    if (pending?.notifications?.length) {
      await plugin.cancel({ notifications: pending.notifications })
    }
  } catch {
    // Nothing scheduled, or the plugin is unavailable.
  }
}

/**
 * Keep the schedule in step with the store. Returns an unsubscribe function.
 *
 * Rebuilds are debounced because a single user action (completing a chore)
 * writes both the chore and its history entry.
 */
export const watchChoresForNotifications = store => {
  if (!isLocalMode() || !isNativeApp()) return () => {}

  let timer = null
  const unsubscribe = store.subscribe(() => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      rescheduleDueNotifications()
    }, 1000)
  })

  rescheduleDueNotifications()

  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

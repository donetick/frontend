import { Capacitor, registerPlugin } from '@capacitor/core'

import { apiClient } from '../utils/ApiClient'

// Native bridge implemented in ios/App/App/WidgetBridgePlugin.swift and
// android/.../widget/WidgetBridgePlugin.java. It persists the snapshot in
// storage the home-screen widgets can read (App Group defaults on iOS,
// SharedPreferences on Android) and asks the OS to redraw them.
const WidgetBridge = registerPlugin('WidgetBridge')

const WINDOW_DAYS = 7
const MAX_TASKS = 100
const MAX_MEMBERS = 12
const PUSH_DEBOUNCE_MS = 1500

const isNative = () => Capacitor.isNativePlatform()

// The snapshot carries every circle member's actionable tasks (due inside the
// 7-day window, overdue included, or awaiting approval — status 3). Each task
// records its assignee so the widgets can filter down to "mine" (the default)
// or show everyone, per the user's widget configuration; the People widget
// derives per-member counts from the same list. The Today widget re-derives
// its subset natively from dueDate so one snapshot feeds all widgets.
export const buildWidgetTasks = chores => {
  const endOfWindow = new Date()
  endOfWindow.setHours(23, 59, 59, 999)
  endOfWindow.setDate(endOfWindow.getDate() + WINDOW_DAYS)
  const cutoff = endOfWindow.getTime()

  return (chores || [])
    .map(chore => {
      if (!chore || chore.id == null) return null
      const approval = chore.status === 3
      const dueDate = chore.nextDueDate
        ? new Date(chore.nextDueDate).getTime()
        : null
      const inWindow = dueDate !== null && dueDate <= cutoff
      if (!approval && !inWindow) return null
      return {
        id: chore.id,
        name: chore.name || '',
        dueDate,
        priority: chore.priority || 0,
        approval,
        assignedTo: chore.assignedTo == null ? null : String(chore.assignedTo),
      }
    })
    .filter(Boolean)
    .sort((a, b) => {
      if (a.approval !== b.approval) return a.approval ? -1 : 1
      if (a.dueDate === null) return b.dueDate === null ? 0 : 1
      if (b.dueDate === null) return -1
      return a.dueDate - b.dueDate
    })
    .slice(0, MAX_TASKS)
}

// Circle members, trimmed to what the widgets render: avatar + short name.
export const buildWidgetMembers = members => {
  return (members || [])
    .filter(member => member && member.userId != null)
    .slice(0, MAX_MEMBERS)
    .map(member => ({
      id: String(member.userId),
      name: member.displayName || member.username || '',
      image: member.image || null,
    }))
}

const pushSnapshot = async queryClient => {
  const choresData = queryClient.getQueryData(['chores', false])
  const chores = choresData?.res
  if (!Array.isArray(chores)) return

  const profileQuery = queryClient
    .getQueryCache()
    .findAll({ queryKey: ['userProfile'] })
    .find(q => q.state.data?.id != null)
  const userId = profileQuery?.state.data?.id
  if (userId == null) return

  const token = apiClient.getToken()
  if (!token) return

  const members = queryClient.getQueryData(['allCircleMembers'])?.res

  await WidgetBridge.update({
    data: JSON.stringify({
      version: 2,
      lastUpdated: Date.now(),
      tasks: buildWidgetTasks(chores),
      members: buildWidgetMembers(members),
    }),
    config: JSON.stringify({
      serverUrl: apiClient.getApiURL(),
      token,
      userId,
    }),
  })
}

/**
 * Watch the react-query cache and mirror every chores update into the
 * home-screen widgets. Covers both fresh fetches and local mutations
 * (complete/skip/approve write through the same cache key).
 */
export const initWidgetSync = queryClient => {
  if (!isNative()) return () => {}

  let timer = null
  const schedule = () => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      pushSnapshot(queryClient).catch(err =>
        console.error('Widget sync failed', err),
      )
    }, PUSH_DEBOUNCE_MS)
  }

  const unsubscribe = queryClient.getQueryCache().subscribe(event => {
    const key = event?.query?.queryKey
    if (
      event?.type === 'updated' &&
      (key?.[0] === 'chores' ||
        key?.[0] === 'userProfile' ||
        key?.[0] === 'allCircleMembers')
    ) {
      schedule()
    }
  })

  return () => {
    clearTimeout(timer)
    unsubscribe()
  }
}

/** Wipe widget storage so no task data lingers after logout. */
export const clearWidgetData = async () => {
  if (!isNative()) return
  try {
    await WidgetBridge.clear()
  } catch (err) {
    console.error('Failed to clear widget data', err)
  }
}

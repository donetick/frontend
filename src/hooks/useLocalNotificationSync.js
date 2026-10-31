import { Capacitor } from '@capacitor/core'
import { useEffect } from 'react'

import { useChores } from '../queries/ChoreQueries'
import {
  useNotificationPreferences,
  useUserProfile,
} from '../queries/UserQueries'
import {
  canScheduleNotification,
  scheduleChoreNotification,
} from '../views/Chores/LocalNotificationScheduler'
import { useAuth } from './useAuth.jsx'

// Shared across effect lifetimes, including StrictMode remounts. A replacement
// must finish cancelling AND scheduling before the next replacement starts.
let scheduling = Promise.resolve()

const useLocalNotificationSync = () => {
  const { isAuthenticated } = useAuth()
  const enabled = Capacitor.isNativePlatform() && isAuthenticated
  const { data: userProfile } = useUserProfile({ enabled })
  const { data: choresData } = useChores(false, { enabled })
  const { data: preferences } = useNotificationPreferences({ enabled })
  const chores = choresData?.res
  const effective = preferences?.effective
  const userId = userProfile?.id

  useEffect(() => {
    if (!enabled || !userId || !chores) return

    let cancelled = false
    scheduling = scheduling
      .then(async () => {
        if (cancelled || !(await canScheduleNotification())) return
        if (cancelled) return
        // The scheduler only needs the real user's ID, not circle members or
        // the currently impersonated user. An empty chore list clears reminders.
        await scheduleChoreNotification(chores, { id: userId }, null, effective)
      })
      .catch(error => {
        console.error('Error syncing local notifications:', error)
      })

    return () => {
      cancelled = true
    }
  }, [enabled, userId, chores, effective])
}

export default useLocalNotificationSync

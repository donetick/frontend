import { Capacitor } from '@capacitor/core'
import moment from 'moment'
import { useEffect, useMemo } from 'react'

import { useChores } from '../queries/ChoreQueries'
import { useUserProfile } from '../queries/UserQueries'
import { setAppBadgeCount } from '../utils/AppBadge'
import { ChoreStatus } from '../utils/Chores'
import { useAuth } from './useAuth.jsx'

/**
 * Keeps the native app icon badge in sync with the number of tasks that are
 * due today or overdue, mirroring Home's "verdict" count. This only reflects
 * state while the app is installed and has fetched chores at least once —
 * updating the badge while the app is fully killed (e.g. from a push) would
 * require the backend to set it in the push payload.
 */
const useAppBadgeSync = () => {
  const isNative = Capacitor.isNativePlatform()
  const { isAuthenticated } = useAuth()
  const { data: userProfile } = useUserProfile({
    enabled: isNative && isAuthenticated,
  })
  const { data } = useChores(false, { enabled: isNative && isAuthenticated })

  const dueOrOverdueCount = useMemo(() => {
    const chores = data?.res ?? []
    const userId = userProfile?.id
    const endOfToday = moment().endOf('day')

    return chores.filter(
      chore =>
        chore.status !== ChoreStatus.PENDING_APPROVAL &&
        chore.nextDueDate &&
        (!chore.assignedTo || chore.assignedTo === userId) &&
        moment(chore.nextDueDate).isSameOrBefore(endOfToday),
    ).length
  }, [data?.res, userProfile?.id])

  useEffect(() => {
    if (!isNative || !isAuthenticated) return
    setAppBadgeCount(dueOrOverdueCount)
  }, [isNative, isAuthenticated, dueOrOverdueCount])
}

export default useAppBadgeSync

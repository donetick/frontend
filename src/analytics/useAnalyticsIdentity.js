import { useEffect } from 'react'

import { useCircleMembers, useUserProfile } from '../queries/UserQueries'
import { isPlusAccount } from '../utils/Helpers'
import { identify, updateCommonProperties } from './index'

/**
 * Keeps the analytics module's identity and cohort super-properties in sync
 * with the app's own data layer. Mounted once, high in the tree, alongside
 * AuthProvider/QueryContext so both queries are already available.
 */
const useAnalyticsIdentity = () => {
  const { data: userProfile } = useUserProfile()
  const { data: circleMembers } = useCircleMembers()

  useEffect(() => {
    if (userProfile?.id) identify(userProfile.id)
  }, [userProfile?.id])

  useEffect(() => {
    updateCommonProperties({
      is_plus_account: Boolean(isPlusAccount(userProfile)),
      circle_member_count: circleMembers?.res?.length ?? 0,
    })
  }, [userProfile, circleMembers?.res?.length])
}

export default useAnalyticsIdentity

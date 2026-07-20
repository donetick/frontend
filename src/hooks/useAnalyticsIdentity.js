import { useEffect } from 'react'

import { identifyUser } from '../analytics/analytics'
import { useUserProfile } from '../queries/UserQueries'

/**
 * Identifies the authenticated user to PostHog whenever the profile becomes
 * available. Mounted once near the app root so it covers password login, OAuth,
 * and refreshed sessions uniformly. No-op while logged out (the profile query
 * is disabled without a token) and when analytics is disabled.
 */
export function useAnalyticsIdentity() {
  const { data: user } = useUserProfile()

  useEffect(() => {
    if (user?.id) {
      identifyUser(user)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps
}

import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { hasSeenOnboarding, isNativeApp } from '../utils/Onboarding'
import { setPendingInvite } from '../utils/PendingInvite'

// Routes a first-run user may legitimately be on without having gone through
// onboarding: the flow itself, deep-link auth callbacks, and the legal pages
// linked from it.
const ALLOWED_PATHS = [
  '/onboarding',
  '/get-started',
  '/login/settings',
  '/privacy',
  '/terms',
  // An invite link is a legitimate first launch: the join view explains itself
  // and routes to sign-in, so onboarding must not swallow the code.
  '/circle/join',
]

const isAllowed = pathname =>
  ALLOWED_PATHS.includes(pathname) || pathname.startsWith('/auth/')

/**
 * Sends first-launch native users to the onboarding flow. Runs on every
 * navigation because an expired session hard-redirects to /login through
 * `window.location`, which remounts the app.
 */
const useOnboardingGate = () => {
  const navigate = useNavigate()
  const { pathname, search } = useLocation()
  const isRedirecting =
    isNativeApp() &&
    !hasSeenOnboarding() &&
    !localStorage.getItem('token') &&
    !isAllowed(pathname)

  useEffect(() => {
    if (!isRedirecting) return

    if (pathname === '/circle/join') {
      setPendingInvite(new URLSearchParams(search).get('code'))
    }

    navigate('/onboarding', { replace: true })
  }, [isRedirecting, pathname, search, navigate])

  return isRedirecting
}

export default useOnboardingGate

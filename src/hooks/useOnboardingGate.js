import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { hasSeenOnboarding, isNativeApp } from '../utils/Onboarding'

// Routes a first-run user may legitimately be on without having gone through
// onboarding: the flow itself, deep-link auth callbacks, and the legal pages
// linked from it.
const ALLOWED_PATHS = [
  '/onboarding',
  '/get-started',
  '/login/settings',
  '/privacy',
  '/terms',
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
  const { pathname } = useLocation()

  useEffect(() => {
    if (!isNativeApp() || hasSeenOnboarding()) return
    // A signed-in user upgrading from an older build has nothing to onboard to.
    if (localStorage.getItem('token')) return
    if (isAllowed(pathname)) return

    navigate('/onboarding', { replace: true })
  }, [pathname, navigate])
}

export default useOnboardingGate

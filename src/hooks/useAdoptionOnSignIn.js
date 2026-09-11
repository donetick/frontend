import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { APP_MODES } from '../data/appMode'

const APP_MODE_KEY = 'appMode'
const TOKEN_KEY = 'token'

// The review screen itself, and auth callback routes it can be reached
// through (OAuth/magic-link redirects remount the app on the same tick the
// token lands), must not be redirected away from themselves.
const ALLOWED_PATHS = ['/adopt-review']
const isAllowed = pathname =>
  ALLOWED_PATHS.includes(pathname) || pathname.startsWith('/auth/')

/**
 * A local-mode user who signs up or signs in ends up with both a token and
 * the leftover `appMode: 'local'` flag — `getAppMode()` already prefers the
 * token, so the app is functionally in account mode, but the local documents
 * haven't been pushed anywhere yet.
 *
 * Signing into an *existing* account that already has its own data is a real
 * decision — silently appending local data on top of it is not something to
 * resolve behind the user's back. So this only redirects to `/adopt-review`
 * (see `AdoptionReviewView`), which previews what would happen and lets the
 * user add it or discard it. `adoptLocalData()` itself is called from there,
 * not from here.
 *
 * Runs from `AppContent` rather than from every sign-in/sign-up code path —
 * there are several (password, OAuth, magic link) and they all end the same
 * way: a token lands in localStorage while `appMode` still says `local`.
 */
export const useAdoptionOnSignIn = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const wasLocal = localStorage.getItem(APP_MODE_KEY) === APP_MODES.LOCAL
  const hasToken = Boolean(localStorage.getItem(TOKEN_KEY))
  const isRedirecting = wasLocal && hasToken && !isAllowed(pathname)

  useEffect(() => {
    if (!isRedirecting) return
    navigate('/adopt-review', { replace: true })
  }, [isRedirecting, navigate])

  return isRedirecting
}

export default useAdoptionOnSignIn

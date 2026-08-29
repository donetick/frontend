import Cookies from 'js-cookie'

// A circle invite link is often the very first thing a new user opens, so the
// code has to survive the trip through login/signup (including OAuth, which
// leaves and re-enters the app) and be replayed once a session exists.
const INVITE_KEY = 'pending_circle_invite'
const REDIRECT_COOKIE = 'ca_redirect'

// `auto=1` tells the join view this visit is the return leg of an auth
// round-trip, so it can submit the request instead of asking a second time.
export const joinCirclePath = code =>
  `/circle/join?code=${encodeURIComponent(code)}&auto=1`

export const setPendingInvite = code => {
  if (!code) return

  try {
    localStorage.setItem(INVITE_KEY, code)
  } catch {
    // The redirect cookie still preserves the invite through authentication.
  }
  // Every post-auth landing point (password login, OAuth callback, MFA) already
  // consumes `ca_redirect`, so reusing it is all the routing this needs.
  Cookies.set(REDIRECT_COOKIE, joinCirclePath(code), { expires: 1 })
}

export const getPendingInvite = () => {
  try {
    return localStorage.getItem(INVITE_KEY)
  } catch {
    return null
  }
}

export const clearPendingInvite = () => {
  try {
    localStorage.removeItem(INVITE_KEY)
  } catch {
    // Ignore unavailable storage during cleanup.
  }

  const redirect = Cookies.get(REDIRECT_COOKIE)
  if (redirect?.startsWith('/circle/join')) {
    Cookies.remove(REDIRECT_COOKIE)
  }
}

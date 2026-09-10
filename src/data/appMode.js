/**
 * Which mode the app is running in.
 *
 *   'local'   — no account. The document store is the only source of truth and
 *               the sync layer is inert; dirty flags just accumulate.
 *   'account' — signed in. Today that still means the existing server-first
 *               path; Phase 4 converges it onto the same document store.
 *   null      — undecided: the user has neither signed in nor chosen local mode,
 *               so onboarding/login owns the screen.
 *
 * This is read synchronously during routing, so it lives in localStorage rather
 * than the document store.
 */

const APP_MODE_KEY = 'appMode'
const APP_MODE_EVENT = 'donetick:app-mode-changed'

export const APP_MODES = {
  LOCAL: 'local',
  ACCOUNT: 'account',
}

const readStoredMode = () => {
  try {
    return window.localStorage.getItem(APP_MODE_KEY)
  } catch {
    return null
  }
}

const hasToken = () => {
  try {
    return Boolean(window.localStorage.getItem('token'))
  } catch {
    return false
  }
}

/**
 * A token always wins: signing in from local mode moves the user to account
 * mode without needing a second write to agree.
 */
export const getAppMode = () => {
  if (typeof window === 'undefined') return null
  if (hasToken()) return APP_MODES.ACCOUNT
  return readStoredMode() === APP_MODES.LOCAL ? APP_MODES.LOCAL : null
}

export const isLocalMode = () => getAppMode() === APP_MODES.LOCAL

export const isAccountMode = () => getAppMode() === APP_MODES.ACCOUNT

/** True once the user has made a choice — used to decide whether to onboard. */
export const hasChosenMode = () => getAppMode() !== null

export const setAppMode = mode => {
  if (typeof window === 'undefined') return
  try {
    if (mode === null) window.localStorage.removeItem(APP_MODE_KEY)
    else window.localStorage.setItem(APP_MODE_KEY, mode)
  } catch {
    // Storage-disabled webview: mode falls back to undecided, which is safe.
  }
  window.dispatchEvent(
    new CustomEvent(APP_MODE_EVENT, { detail: { mode: getAppMode() } }),
  )
}

export const enterLocalMode = () => setAppMode(APP_MODES.LOCAL)

export const subscribeToAppMode = callback => {
  if (typeof window === 'undefined') return () => {}

  const handle = event => {
    if (event?.type === 'storage' && event.key !== APP_MODE_KEY) return
    callback(getAppMode())
  }

  window.addEventListener(APP_MODE_EVENT, handle)
  window.addEventListener('storage', handle)
  return () => {
    window.removeEventListener(APP_MODE_EVENT, handle)
    window.removeEventListener('storage', handle)
  }
}

/**
 * What each mode supports. Views gate on a capability rather than on
 * `mode === 'local'`, so turning a feature back on in Phase 4 is a one-line
 * change here instead of a hunt through the view tree.
 */
const CAPABILITIES = {
  [APP_MODES.LOCAL]: {
    chores: true,
    labels: true,
    projects: true,
    subtasks: true,
    history: true,
    localNotifications: true,
    backup: true,

    account: false,
    sharing: false,
    assignees: false,
    members: false,
    points: false,
    approval: false,
    nudges: false,
    things: false,
    attachments: false,
    realtime: false,
    notificationProviders: false,
    apiTokens: false,
    mfa: false,
    subscriptions: false,
    ai: false,
  },
}

// Account mode keeps everything on — it is today's app, unchanged.
const ACCOUNT_CAPABILITIES = Object.fromEntries(
  Object.keys(CAPABILITIES[APP_MODES.LOCAL]).map(key => [key, true]),
)

CAPABILITIES[APP_MODES.ACCOUNT] = ACCOUNT_CAPABILITIES

/** Capability map for a mode. An undecided mode gets the local-mode map. */
export const capabilitiesFor = mode =>
  CAPABILITIES[mode] ?? CAPABILITIES[APP_MODES.LOCAL]

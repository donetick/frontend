/**
 * Ambient session state worth having the moment something breaks: how long the
 * user has been in the app, how they got to the screen that failed, which
 * server they were talking to and what it had already refused.
 *
 * Deliberately dependency-free — ApiClient imports it on the request path, so
 * anything imported here would risk a module cycle. Everything is in memory
 * and dies with the tab; nothing is persisted.
 */

const SESSION_STARTED_AT = Date.now()
const SESSION_ID = `${SESSION_STARTED_AT.toString(36)}-${Math.random()
  .toString(36)
  .slice(2, 8)}`

// A cold start (vs. a reload of an already-running app) changes what a crash
// means: a reload loop looks very different from a first-launch failure.
const NAVIGATION_TYPE =
  performance.getEntriesByType?.('navigation')?.[0]?.type ?? 'unknown'

const MAX_ROUTES = 10
const MAX_API_FAILURES = 8

const routeTrail = []
const apiFailures = []
let backgroundedCount = 0
let serverVersion = null

// ---------------------------------------------------------------------------
// Route trail
// ---------------------------------------------------------------------------

/**
 * Records a navigation and closes out the dwell time on the previous screen.
 * "The crash happened 400ms after landing on /chores/12 from /chores" is a
 * far better bug report than "the crash happened on /chores/12".
 */
export const recordRoute = path => {
  if (!path) return
  const now = Date.now()
  const previous = routeTrail[routeTrail.length - 1]
  if (previous) {
    if (previous.path === path) return
    previous.dwellMs = now - previous.at
  }
  routeTrail.push({ path, at: now })
  if (routeTrail.length > MAX_ROUTES) routeTrail.shift()
}

export const getRouteTrail = () => {
  const now = Date.now()
  return routeTrail.map((entry, index) => ({
    path: entry.path,
    // The current screen has no closing dwell yet; measure it up to now.
    dwellMs:
      entry.dwellMs ??
      (index === routeTrail.length - 1 ? now - entry.at : null),
    msAgo: now - entry.at,
  }))
}

/** The screen the user came from, which is usually where the bug was planted. */
export const getPreviousRoute = () =>
  routeTrail.length > 1 ? routeTrail[routeTrail.length - 2].path : null

// ---------------------------------------------------------------------------
// Server identity
// ---------------------------------------------------------------------------

/**
 * Picks the server build out of response headers. Costs nothing when the
 * server doesn't send them — the field simply stays null.
 */
export const recordServerVersionFromResponse = response => {
  if (serverVersion) return
  try {
    serverVersion =
      response?.headers?.get?.('x-donetick-version') ||
      response?.headers?.get?.('x-api-version') ||
      null
  } catch {
    // headers may be inaccessible on opaque responses; not worth reporting
  }
}

export const setServerVersion = version => {
  if (version) serverVersion = version
}

export const getServerVersion = () => serverVersion

// ---------------------------------------------------------------------------
// API failures
// ---------------------------------------------------------------------------

/** Strips ids and query strings so failures group by endpoint, not by row. */
export const normalizeEndpoint = endpoint =>
  String(endpoint || '')
    .split('?')[0]
    .replace(/\/\d+/g, '/:id')

export const recordApiFailure = ({ endpoint, method, status }) => {
  apiFailures.push({
    at: Date.now(),
    method: method || 'GET',
    endpoint: normalizeEndpoint(endpoint),
    status: status ?? 'network',
  })
  if (apiFailures.length > MAX_API_FAILURES) apiFailures.shift()
}

export const getApiFailures = () => {
  const now = Date.now()
  return apiFailures.map(failure => ({
    method: failure.method,
    endpoint: failure.endpoint,
    status: failure.status,
    msAgo: now - failure.at,
  }))
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') backgroundedCount += 1
  })
}

// ---------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------

const getServiceWorkerState = async () => {
  if (!('serviceWorker' in navigator)) return { supported: false }
  try {
    const registration = await navigator.serviceWorker.getRegistration()
    return {
      supported: true,
      controlled: Boolean(navigator.serviceWorker.controller),
      // A waiting worker means the user is running a stale bundle against a
      // newer deploy — the usual cause of chunk-load failures after a release.
      updateWaiting: Boolean(registration?.waiting),
    }
  } catch {
    return { supported: true, controlled: null, updateWaiting: null }
  }
}

const getStorageState = async () => {
  try {
    const { quota, usage } = await navigator.storage.estimate()
    return {
      usageMb: Math.round((usage / 1048576) * 10) / 10,
      quotaMb: Math.round(quota / 1048576),
      // Storage pressure produces failures that look like anything but.
      pressure: quota ? Math.round((usage / quota) * 100) : null,
    }
  } catch {
    return null
  }
}

export const getSessionDiagnostics = async () => {
  const [serviceWorker, storage] = await Promise.all([
    getServiceWorkerState(),
    getStorageState(),
  ])

  return {
    sessionId: SESSION_ID,
    sessionStartedAt: new Date(SESSION_STARTED_AT).toISOString(),
    sessionDurationMs: Date.now() - SESSION_STARTED_AT,
    navigationType: NAVIGATION_TYPE,
    backgroundedCount,
    serverVersion,
    previousRoute: getPreviousRoute(),
    routeTrail: getRouteTrail(),
    apiFailures: getApiFailures(),
    // Chromium only; absent elsewhere rather than faked.
    heapUsedMb: performance.memory
      ? Math.round(performance.memory.usedJSHeapSize / 1048576)
      : null,
    storage,
    serviceWorker,
  }
}

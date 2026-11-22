/**
 * Whether the backend is answering — watched on every request, for everyone.
 *
 * NetworkManager already tracks server reachability, but that flag is
 * deliberately gated behind the offline feature because flipping it drives the
 * sync engine and the query-level offline fallbacks. This module is the
 * read-only half of the same story: it never changes app behaviour, it only
 * reports, so it can watch the server even when nothing is being queued and
 * let the UI say "we can't reach the server" instead of failing silently.
 *
 * Dependency-free on purpose — ApiClient imports it on the request path, so a
 * static import of anything ApiClient touches would risk a module cycle.
 */

export const SERVER_STATUS = {
  unknown: 'unknown',
  healthy: 'healthy',
  // Answering, but with server errors: the box is up, something behind it isn't.
  degraded: 'degraded',
  // Not answering at all: down, restarting, or unreachable from this device.
  unreachable: 'unreachable',
}

// One 5xx is usually one bad endpoint; a run of them is the server itself.
const DEGRADED_THRESHOLD = 2

const PROBE_TIMEOUT_MS = 8_000

let state = {
  status: SERVER_STATUS.unknown,
  lastSuccessAt: null,
  lastFailureAt: null,
  // Number for an HTTP answer, 'network' when nothing came back at all.
  lastStatusCode: null,
  consecutiveServerErrors: 0,
}

const listeners = new Set()

/**
 * Listeners only hear about status changes, not every recorded request: the
 * indicator lives in the nav bar, and re-rendering it on each API response to
 * refresh a timestamp nobody is reading would be pure waste. Screens that show
 * the timestamps read them with getServerHealth() on their own cadence.
 */
const publish = next => {
  const previousStatus = state.status
  state = { ...state, ...next }
  if (state.status === previousStatus) return
  listeners.forEach(listener => listener(state))
}

export const getServerHealth = () => state

export const subscribeToServerHealth = listener => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * Any HTTP answer — including a 401 or a 404 — proves the server is up, so only
 * 5xx counts against it.
 */
export const recordServerResponse = statusCode => {
  const isServerError = Number(statusCode) >= 500
  const consecutiveServerErrors = isServerError
    ? state.consecutiveServerErrors + 1
    : 0
  const now = Date.now()

  publish({
    status:
      consecutiveServerErrors >= DEGRADED_THRESHOLD
        ? SERVER_STATUS.degraded
        : SERVER_STATUS.healthy,
    lastSuccessAt: isServerError ? state.lastSuccessAt : now,
    lastFailureAt: isServerError ? now : state.lastFailureAt,
    lastStatusCode: statusCode ?? null,
    consecutiveServerErrors,
  })
}

/** fetch() threw: a timeout, a DNS failure, a refused connection. */
export const recordServerUnreachable = () => {
  publish({
    status: SERVER_STATUS.unreachable,
    lastFailureAt: Date.now(),
    lastStatusCode: 'network',
    consecutiveServerErrors: 0,
  })
}

let probeInFlight = null

/**
 * Asks the server directly whether it is there. Shares one request between
 * concurrent callers so a double-tap on "check again" doesn't double-probe.
 */
export const probeServer = () => {
  if (probeInFlight) return probeInFlight

  probeInFlight = (async () => {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS)
    try {
      const { apiClient } = await import('./ApiClient')
      await apiClient.init()
      // Raw fetch rather than apiClient: a probe must not drag an expired
      // session through token refresh and a forced logout. Whether this user is
      // still authorized is a different question from whether the server is up.
      const response = await fetch(`${apiClient.getApiURL()}/resource`, {
        method: 'GET',
        headers: apiClient.getHeaders(),
        signal: controller.signal,
      })
      recordServerResponse(response.status)
    } catch {
      recordServerUnreachable()
    } finally {
      clearTimeout(timeoutId)
    }
    return state
  })().finally(() => {
    probeInFlight = null
  })

  return probeInFlight
}

import { getSessionDiagnostics } from './DiagnosticsSession'
import { collectFeedbackContext } from './FeedbackService'

const GITHUB_URL = 'https://github.com/donetick/donetick'

// Reports go to the same relay as feedback unless a dedicated one is set, so
// self-hosters who point at their own Worker get both for the price of one.
const REPORT_URL =
  import.meta.env.VITE_ERROR_REPORT_WEBHOOK_URL ||
  import.meta.env.VITE_FEEDBACK_WEBHOOK_URL

// Same trap as feedback: a chat webhook pasted straight in would reject our
// schema and ship inside the public bundle. Relay through the Worker instead.
const isRawChatWebhook = url =>
  /^https:\/\/(discord(app)?\.com\/api\/webhooks|hooks\.slack\.com)/i.test(
    url || '',
  )

export const SUBMIT_RESULT = {
  SENT: 'sent',
  FAILED: 'failed',
  UNCONFIGURED: 'unconfigured',
  MISCONFIGURED: 'misconfigured',
  SELF_HOSTED: 'self-hosted',
}

const MAX_STACK = 4000

const clamp = (value, max) =>
  typeof value === 'string' && value.length > max
    ? `${value.slice(0, max)}\n… truncated`
    : value

/** Short, human-readable handle the user can quote back to support. */
export const newReportId = () =>
  `DT-${Date.now().toString(36).toUpperCase().slice(-5)}-${Math.random()
    .toString(36)
    .toUpperCase()
    .slice(2, 6)}`

const safeMessage = error => {
  const message = error?.message ?? error?.statusText
  if (!message || message === '[object Object]') return null
  return message
}

/** Everything about the failure itself, normalised across throw shapes. */
const describeError = (error, errorInfo) => {
  if (!error) return { name: 'Unknown', message: null }
  return {
    name: error.name ?? error.constructor?.name ?? typeof error,
    message: safeMessage(error) ?? String(error).slice(0, 500),
    // react-router route errors carry an HTTP shape instead of a stack.
    status: error.status ?? error.response?.status ?? null,
    statusText: error.statusText ?? null,
    // Vite/react-router attach a digest to server-side thrown responses.
    digest: error.digest ?? null,
    stack: clamp(error.stack ?? null, MAX_STACK),
    componentStack: clamp(errorInfo?.componentStack ?? null, MAX_STACK),
  }
}

/** Everything about the environment the failure happened in. */
const describeRuntime = () => {
  const connection =
    navigator.connection ||
    navigator.mozConnection ||
    navigator.webkitConnection

  return {
    url: window.location.href,
    route: window.location.pathname + window.location.search,
    referrer: document.referrer || null,
    viewport: `${window.innerWidth}×${window.innerHeight}`,
    screen: `${window.screen?.width}×${window.screen?.height}`,
    devicePixelRatio: window.devicePixelRatio,
    online: navigator.onLine,
    connectionType: connection?.effectiveType ?? null,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    colorScheme: window.matchMedia?.('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light',
    standalone: window.matchMedia?.('(display-mode: standalone)').matches,
    userAgent: navigator.userAgent,
  }
}

const cachedUser = () => {
  try {
    return JSON.parse(localStorage.getItem('user') || 'null')
  } catch {
    return null
  }
}

/**
 * The full diagnostic bundle. Deliberately assembled in one place so the copy
 * button, the GitHub fallback and the webhook all describe the same crash.
 *
 * Reads the signed-in user from cache rather than the network: by the time
 * this runs the app has already failed, and a fetch may be exactly what broke.
 */
export const collectErrorReport = async ({ error, errorInfo, reportId }) => {
  const user = cachedUser()
  const [context, session] = await Promise.all([
    collectFeedbackContext({
      feature: window.location.pathname,
      userProfile: user,
    }).catch(() => ({})),
    getSessionDiagnostics().catch(() => ({})),
  ])

  return {
    reportId: reportId ?? newReportId(),
    occurredAt: new Date().toISOString(),
    // No error means the user came here deliberately from settings rather than
    // off the back of a crash — same diagnostics, different story to tell.
    kind: error ? 'crash' : 'bug',
    error: describeError(error, errorInfo),
    runtime: describeRuntime(),
    app: context,
    session,
  }
}

/** The plain-text rendering used by the copy button and the details panel. */
const formatDuration = ms => {
  if (ms == null) return 'unknown'
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${Math.round(ms / 1000)}s`
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes}m ${Math.round((ms % 60_000) / 1000)}s`
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

export const formatErrorReport = report => {
  if (!report) return ''
  const { app, error, runtime, session = {} } = report
  const lines = [
    `Report ID: ${report.reportId}`,
    `Time: ${report.occurredAt}`,
    '',
    // A user-initiated report has no throw behind it; "Error: Unknown" would
    // only be noise in the panel the user is being asked to read.
    report.kind === 'bug'
      ? 'Reported manually (no crash)'
      : `Error: ${error.name}${error.message ? `: ${error.message}` : ''}`,
    error.status
      ? `HTTP: ${error.status} ${error.statusText ?? ''}`.trim()
      : null,
    '',
    `URL: ${runtime.url}`,
    session.previousRoute ? `Came from: ${session.previousRoute}` : null,
    '',
    `App: ${app.appVersion} · ${app.platform}${app.isNative ? ' (native)' : ''}`,
    `Server: ${session.serverVersion ?? 'not reported'}`,
    `Session: ${formatDuration(session.sessionDurationMs)} active · ${
      session.navigationType ?? 'unknown'
    } start · backgrounded ${session.backgroundedCount ?? 0}×`,
    `Device: ${app.deviceModel} · ${app.osVersion}`,
    `Viewport: ${runtime.viewport} @${runtime.devicePixelRatio}x · ${runtime.colorScheme}`,
    `Locale: ${app.locale} · ${runtime.timezone}`,
    `Network: ${runtime.online ? 'online' : 'offline'}${
      runtime.connectionType ? ` (${runtime.connectionType})` : ''
    }`,
    `Hosting: ${app.hosting}`,
    app.userId ? `User: ${app.userId}` : null,
    session.storage
      ? `Storage: ${session.storage.usageMb}MB / ${session.storage.quotaMb}MB (${session.storage.pressure}%)`
      : null,
    session.heapUsedMb ? `Heap: ${session.heapUsedMb}MB` : null,
    session.serviceWorker?.supported
      ? `Service worker: ${
          session.serviceWorker.controlled ? 'controlling' : 'not controlling'
        }${session.serviceWorker.updateWaiting ? ' · UPDATE WAITING' : ''}`
      : null,
  ].filter(Boolean)

  if (session.routeTrail?.length) {
    lines.push(
      '',
      'Route trail (oldest first):',
      ...session.routeTrail.map(
        entry =>
          `- ${entry.path} · ${formatDuration(entry.dwellMs)} · ${formatDuration(
            entry.msAgo,
          )} ago`,
      ),
    )
  }
  if (session.apiFailures?.length) {
    lines.push(
      '',
      'Recent API failures:',
      ...session.apiFailures.map(
        failure =>
          `- ${failure.method} ${failure.endpoint} → ${
            failure.status
          } (${formatDuration(failure.msAgo)} ago)`,
      ),
    )
  }
  if (app.recentErrors?.length) {
    lines.push('', 'Recent errors:', ...app.recentErrors.map(e => `- ${e}`))
  }
  if (error.componentStack) {
    lines.push('', 'Component stack:', error.componentStack.trim())
  }
  if (error.stack) {
    lines.push('', 'Stack:', error.stack)
  }
  return lines.join('\n')
}

/**
 * Pre-filled GitHub issue for self-hosted instances — their crash data never
 * leaves infrastructure they control, and they see it before it is published.
 */
export const buildErrorIssueUrl = ({ description, report }) => {
  const isBug = report.kind === 'bug'
  const title = isBug
    ? `[bug] ${description?.trim().slice(0, 80) || 'Reported from the app'}`
    : `[crash] ${
        report.error.message?.slice(0, 80) ||
        report.error.name ||
        'Unexpected error'
      }`
  const body = [
    '### What happened',
    description?.trim() || '_no description provided_',
    '',
    '### Diagnostics',
    '```',
    formatErrorReport(report),
    '```',
  ].join('\n')

  return `${GITHUB_URL}/issues/new?labels=bug&title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(body)}`
}

/**
 * Posts the report to the relay. Never throws — a failed crash report must not
 * produce a second crash, so every path resolves to a result the UI can show.
 */
export const submitErrorReport = async ({
  contactEmail,
  description,
  report,
}) => {
  // The relay rejects reports without an error. Manual bug reports have no
  // thrown Error, so mark only the submitted copy while preserving the local
  // diagnostics as a manual report.
  const submittedReport =
    report.kind === 'bug'
      ? {
          ...report,
          error: {
            ...report.error,
            name: 'ManualBugReport',
            message: 'Submitted manually from the app',
          },
        }
      : report

  const payload = {
    source: 'donetick-app',
    kind: 'error-report',
    reportId: report.reportId,
    description: description?.trim() || null,
    contactEmail: contactEmail?.trim() || null,
    report: submittedReport,
  }

  // Enforced here, not only in the UI, so no future caller can relay a
  // self-hosted instance's stack traces to the hosted endpoint.
  if (report.app?.hosting !== 'cloud') {
    return {
      result: SUBMIT_RESULT.SELF_HOSTED,
      githubUrl: buildErrorIssueUrl({ description, report }),
    }
  }

  if (!REPORT_URL) {
    console.info('ErrorReportService: no endpoint configured, report:', payload)
    return {
      result: SUBMIT_RESULT.UNCONFIGURED,
      githubUrl: buildErrorIssueUrl({ description, report }),
    }
  }

  if (isRawChatWebhook(REPORT_URL)) {
    console.error(
      'ErrorReportService: the report URL points directly at a Discord/Slack ' +
        'webhook. Deploy the relay Worker and point the variable at it.',
      payload,
    )
    return {
      result: SUBMIT_RESULT.MISCONFIGURED,
      githubUrl: buildErrorIssueUrl({ description, report }),
    }
  }

  try {
    const response = await fetch(REPORT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (response.ok) return { result: SUBMIT_RESULT.SENT }
  } catch (submitError) {
    console.warn('ErrorReportService: submission failed', submitError)
  }

  return {
    result: SUBMIT_RESULT.FAILED,
    githubUrl: buildErrorIssueUrl({ description, report }),
  }
}

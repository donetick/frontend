import { InAppReview } from '@capacitor-community/in-app-review'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Preferences } from '@capacitor/preferences'
import { isOfficialDonetickInstance } from '../utils/FeatureToggle'

const STATE_KEY = 'feedbackState'

// Eligibility thresholds for the automatic sentiment prompt.
const MIN_COMPLETIONS = 10
const MIN_DAYS_SINCE_SIGNUP = 7
const COOLDOWN_DAYS = 120
// A recent crash/API failure poisons the sentiment reading, so hold off.
const ERROR_QUIET_PERIOD_MS = 10 * 60 * 1000

const APP_STORE_URL =
  'https://apps.apple.com/app/apple-store/id6742807441?pt=127258663&ct=website&mt=8'
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.donetick.app'
const GITHUB_URL = 'https://github.com/donetick/donetick'

const DAY_MS = 24 * 60 * 60 * 1000

const defaultState = {
  completions: 0,
  // null until the first prompt is shown/snoozed.
  lastPromptedAt: null,
  lastPromptedVersion: null,
  dismissCount: 0,
  reviewRequestedAt: null,
  lastSentiment: null,
  optedOut: false,
  // Developer Settings escape hatch; never set in normal use.
  devForced: false,
}

let cachedState = null

const readState = async () => {
  if (cachedState) return cachedState
  try {
    const { value } = await Preferences.get({ key: STATE_KEY })
    cachedState = { ...defaultState, ...(value ? JSON.parse(value) : {}) }
  } catch (error) {
    console.warn('FeedbackService: unable to read state', error)
    cachedState = { ...defaultState }
  }
  return cachedState
}

const writeState = async patch => {
  const current = await readState()
  cachedState = { ...current, ...patch }
  try {
    await Preferences.set({
      key: STATE_KEY,
      value: JSON.stringify(cachedState),
    })
  } catch (error) {
    console.warn('FeedbackService: unable to persist state', error)
  }
  return cachedState
}

export const getFeedbackState = () => readState()

/**
 * Counts a completed task towards prompt eligibility. Called from the single
 * network choke point for completions so offline completions are counted when
 * they sync rather than twice.
 */
export const recordTaskCompleted = async () => {
  const state = await readState()
  // Stop writing once we are well past the threshold; nothing reads the exact
  // number beyond reporting it as context.
  if (state.completions > MIN_COMPLETIONS * 100) return
  await writeState({ completions: state.completions + 1 })
}

// ---------------------------------------------------------------------------
// Recent error breadcrumbs (in memory only, never persisted)
// ---------------------------------------------------------------------------

const recentErrors = []
const MAX_ERRORS = 5

export const recordFeedbackError = message => {
  if (!message) return
  recentErrors.push({ at: Date.now(), message: String(message).slice(0, 300) })
  if (recentErrors.length > MAX_ERRORS) recentErrors.shift()
}

let errorListenersInstalled = false

export const installFeedbackErrorListeners = () => {
  if (errorListenersInstalled || typeof window === 'undefined') return
  errorListenersInstalled = true
  window.addEventListener('error', event => {
    recordFeedbackError(event?.message)
  })
  window.addEventListener('unhandledrejection', event => {
    recordFeedbackError(event?.reason?.message || event?.reason)
  })
}

const hasRecentError = () =>
  recentErrors.some(error => Date.now() - error.at < ERROR_QUIET_PERIOD_MS)

// ---------------------------------------------------------------------------
// Context collection
// ---------------------------------------------------------------------------

const getAppVersion = async () => {
  if (Capacitor.isNativePlatform()) {
    try {
      const { App } = await import('@capacitor/app')
      const info = await App.getInfo()
      return `${info.version} (${info.build})`
    } catch {
      // fall through to the web bundle version
    }
  }
  return import.meta.env.VITE_APP_VERSION || 'web'
}

const getDeviceContext = async () => {
  try {
    const info = await Device.getInfo()
    return {
      deviceModel: [info.manufacturer, info.model].filter(Boolean).join(' '),
      osVersion: `${info.operatingSystem} ${info.osVersion}`,
    }
  } catch {
    return { deviceModel: 'unknown', osVersion: 'unknown' }
  }
}

/**
 * Everything we attach to a submission without asking the user for it.
 */
export const collectFeedbackContext = async ({ feature, userProfile } = {}) => {
  const [version, device, state, isCloud] = await Promise.all([
    getAppVersion(),
    getDeviceContext(),
    readState(),
    isOfficialDonetickInstance().catch(() => false),
  ])

  const signupDate = userProfile?.created_at
  const daysSinceSignup = signupDate
    ? Math.floor((Date.now() - new Date(signupDate).getTime()) / DAY_MS)
    : null

  return {
    appVersion: version,
    platform: Capacitor.getPlatform(),
    isNative: Capacitor.isNativePlatform(),
    deviceModel: device.deviceModel,
    osVersion: device.osVersion,
    locale:
      localStorage.getItem('i18nextLng') || navigator.language || 'unknown',
    hosting: isCloud ? 'cloud' : 'self-hosted',
    feature: feature || 'unknown',
    tasksCompleted: state.completions,
    daysSinceSignup,
    userId: userProfile?.id ?? null,
    subscription: userProfile?.subscription ?? null,
    recentErrors: recentErrors.map(error => error.message),
    submittedAt: new Date().toISOString(),
  }
}

// ---------------------------------------------------------------------------
// Eligibility
// ---------------------------------------------------------------------------

/**
 * Runs every gate and reports which ones failed, so Developer Settings can
 * explain why the prompt is or isn't showing rather than just saying "no".
 */
export const evaluatePromptEligibility = async ({ userProfile } = {}) => {
  const state = await readState()
  const version = await getAppVersion()

  if (state.devForced) {
    return { eligible: true, forced: true, blockers: [], state, version }
  }

  const blockers = []

  if (state.optedOut) {
    blockers.push('User opted out (chose a sentiment, or dismissed 3 times)')
  }
  if (state.completions < MIN_COMPLETIONS) {
    blockers.push(
      `Only ${state.completions} completions, needs ${MIN_COMPLETIONS}`,
    )
  }
  if (hasRecentError()) {
    blockers.push('An error occurred in the last 10 minutes')
  }

  const signupDate = userProfile?.createdAt
  if (signupDate) {
    const days = (Date.now() - new Date(signupDate).getTime()) / DAY_MS
    if (days < MIN_DAYS_SINCE_SIGNUP) {
      blockers.push(
        `Account is ${Math.floor(days)} days old, needs ${MIN_DAYS_SINCE_SIGNUP}`,
      )
    }
  }

  if (state.lastPromptedAt) {
    const daysSincePrompt = (Date.now() - state.lastPromptedAt) / DAY_MS
    if (daysSincePrompt < COOLDOWN_DAYS) {
      blockers.push(
        `Cooldown: ${Math.ceil(COOLDOWN_DAYS - daysSincePrompt)} days remaining`,
      )
    }
  }

  // Never ask twice on the same build, even after the cooldown expires.
  if (state.lastPromptedVersion && state.lastPromptedVersion === version) {
    blockers.push(`Already prompted on this version (${version})`)
  }

  return {
    eligible: blockers.length === 0,
    forced: false,
    blockers,
    state,
    version,
  }
}

export const shouldShowSentimentPrompt = async options =>
  (await evaluatePromptEligibility(options)).eligible

/** Developer Settings: bypass every gate on the next eligibility check. */
export const setDevForcedPrompt = forced => writeState({ devForced: !!forced })

/** Developer Settings: back to a never-prompted, zero-completions user. */
export const resetFeedbackState = async () => {
  cachedState = { ...defaultState }
  try {
    await Preferences.remove({ key: STATE_KEY })
  } catch (error) {
    console.warn('FeedbackService: unable to clear state', error)
  }
  return cachedState
}

export const markPromptShown = async () => {
  const version = await getAppVersion()
  return writeState({
    lastPromptedAt: Date.now(),
    lastPromptedVersion: version,
    // A forced prompt is spent once shown, otherwise it would fire on every
    // visit to My Chores.
    devForced: false,
  })
}

export const markPromptDismissed = async () => {
  const state = await readState()
  const dismissCount = state.dismissCount + 1
  // Three dismissals in a row is an answer: stop asking automatically.
  return writeState({ dismissCount, optedOut: dismissCount >= 3 })
}

export const markSentiment = async sentiment =>
  writeState({ lastSentiment: sentiment, dismissCount: 0 })

export const optOutOfFeedbackPrompts = () => writeState({ optedOut: true })

// ---------------------------------------------------------------------------
// Store review + submission
// ---------------------------------------------------------------------------

export const getStoreUrl = () => {
  const platform = Capacitor.getPlatform()
  if (platform === 'ios') return APP_STORE_URL
  if (platform === 'android') return PLAY_STORE_URL
  return GITHUB_URL
}

export const storeLinks = {
  appStore: APP_STORE_URL,
  playStore: PLAY_STORE_URL,
  github: GITHUB_URL,
}

/**
 * Asks the OS to show its native review dialog. The OS decides whether to
 * actually display it and gives no feedback either way, so this resolves true
 * only to mean "the request went through".
 */
export const requestStoreReview = async () => {
  if (!Capacitor.isNativePlatform()) return false
  try {
    await InAppReview.requestReview()
    await writeState({ reviewRequestedAt: Date.now(), optedOut: true })
    return true
  } catch (error) {
    console.warn('FeedbackService: review request failed', error)
    return false
  }
}

const WEBHOOK_URL = import.meta.env.VITE_FEEDBACK_WEBHOOK_URL

/**
 * A chat-provider webhook pasted straight into the env var. That can't work —
 * the app posts its own schema, which Discord rejects with "Cannot send an
 * empty message" (50006) — and it would publish the webhook to every user,
 * since VITE_ vars are baked into the bundle. Relay through workers/feedback.
 */
const isRawChatWebhook = url =>
  /^https:\/\/(discord(app)?\.com\/api\/webhooks|hooks\.slack\.com)/i.test(
    url || '',
  )

export const isFeedbackSubmissionConfigured = () =>
  Boolean(WEBHOOK_URL) && !isRawChatWebhook(WEBHOOK_URL)

/** Developer Settings: flag the misconfiguration in the UI, not just the log. */
export const isRawChatWebhookConfigured = () => isRawChatWebhook(WEBHOOK_URL)

/**
 * Whether this app is talking to the hosted donetick.com service. Self-hosted
 * instances route feedback to GitHub instead of the webhook, so their data
 * never leaves infrastructure they control.
 */
export const isCloudInstance = () =>
  isOfficialDonetickInstance().catch(() => false)

export const SUBMIT_RESULT = {
  SENT: 'sent',
  FAILED: 'failed',
  UNCONFIGURED: 'unconfigured',
  MISCONFIGURED: 'misconfigured',
  SELF_HOSTED: 'self-hosted',
}

/**
 * Builds a pre-filled GitHub issue for self-hosted users. Everything the
 * webhook would have collected goes into the issue body, where the user can
 * see and edit it before anything is published.
 */
export const buildGithubIssueUrl = ({
  sentiment,
  category,
  message,
  context,
}) => {
  const labelFor = {
    bugs: 'bug',
    missingFeature: 'feature request',
    tooComplicated: 'usability',
    slow: 'performance',
    notifications: 'notifications',
    ai: 'ai',
    other: 'feedback',
  }
  const title = `[${labelFor[category] || 'feedback'}] ${
    message?.split('\n')[0]?.slice(0, 80) || 'App feedback'
  }`

  const body = [
    message?.trim() || '_no description_',
    '',
    '---',
    '',
    '<details><summary>Environment</summary>',
    '',
    `- App version: ${context.appVersion}`,
    `- Platform: ${context.platform}${context.isNative ? ' (native)' : ''}`,
    `- Device: ${context.deviceModel}`,
    `- OS: ${context.osVersion}`,
    `- Locale: ${context.locale}`,
    `- Hosting: ${context.hosting}`,
    `- Screen: ${context.feature}`,
    `- Sentiment: ${sentiment}`,
    ...(context.recentErrors.length
      ? ['', 'Recent errors:', '```', ...context.recentErrors, '```']
      : []),
    '',
    '</details>',
  ].join('\n')

  return `${GITHUB_URL}/issues/new?title=${encodeURIComponent(
    title,
  )}&body=${encodeURIComponent(body)}`
}

/**
 * Posts the structured feedback plus the auto-collected context to the
 * configured webhook. Never throws, so the UI can show a soft failure without
 * losing what the user typed.
 *
 * Self-hosted instances are never relayed: the caller gets SELF_HOSTED plus a
 * pre-filled GitHub issue URL to send the user to instead.
 */
export const submitFeedback = async ({
  sentiment,
  category,
  message,
  feature,
  userProfile,
}) => {
  const context = await collectFeedbackContext({ feature, userProfile })
  const payload = {
    source: 'donetick-app',
    sentiment,
    category: category || null,
    message: message?.trim() || null,
    context,
  }

  // Enforced here rather than only in the UI so no future caller can leak a
  // self-hosted user's feedback to the hosted relay.
  if (context.hosting !== 'cloud') {
    return {
      result: SUBMIT_RESULT.SELF_HOSTED,
      githubUrl: buildGithubIssueUrl({ sentiment, category, message, context }),
    }
  }

  if (!WEBHOOK_URL) {
    console.info('FeedbackService: no webhook configured, feedback:', payload)
    return { result: SUBMIT_RESULT.UNCONFIGURED }
  }

  if (isRawChatWebhook(WEBHOOK_URL)) {
    console.error(
      'FeedbackService: VITE_FEEDBACK_WEBHOOK_URL points directly at a ' +
        'Discord/Slack webhook. Discord will reject this with 50006 ' +
        '("Cannot send an empty message") because the app posts its own ' +
        'schema, and the URL would ship inside the public bundle. Deploy ' +
        'workers/feedback and point the variable at the Worker instead.',
      payload,
    )
    return { result: SUBMIT_RESULT.MISCONFIGURED }
  }

  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return {
      result: response.ok ? SUBMIT_RESULT.SENT : SUBMIT_RESULT.FAILED,
    }
  } catch (error) {
    console.warn('FeedbackService: submission failed', error)
    return { result: SUBMIT_RESULT.FAILED }
  }
}

export const FEEDBACK_CATEGORIES = [
  'bugs',
  'missingFeature',
  'tooComplicated',
  'slow',
  'notifications',
  'ai',
  'other',
]

export const SENTIMENTS = {
  LOVE: 'love',
  OKAY: 'okay',
  ISSUES: 'issues',
}

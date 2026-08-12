import { getAppVersion, getDeviceContext } from '../utils/DeviceInfo'
import { isOfficialDonetickInstance } from '../utils/FeatureToggle'
import {
  clearAnonymousIdentity,
  getStoredConsent,
  resolveEffectiveConsent,
  resolveIdentity,
  setStoredConsent,
} from './consent'
import {
  sanitizeErrorProperties,
  sanitizeEventProperties,
} from './eventSchemas'
import { getClient, getClientSync, isConfigured } from './posthogClient'

const state = {
  initialized: false,
  initializing: null,
  deploymentType: null, // 'cloud' | 'self_hosted'
  consent: { analytics: 'unknown', crash: 'unknown' },
  distinctId: null,
  common: { is_plus_account: false, circle_member_count: 0 },
}

const resolveDeploymentType = async () => {
  const isCloud = await isOfficialDonetickInstance().catch(() => false)
  return isCloud ? 'cloud' : 'self_hosted'
}

const attachBaseProperties = async posthog => {
  const [appVersion, device] = await Promise.all([
    getAppVersion(),
    getDeviceContext(),
  ])
  posthog.register({
    deployment_type: state.deploymentType,
    app_version: appVersion,
    platform:
      typeof window !== 'undefined' && window.Capacitor
        ? window.Capacitor.getPlatform()
        : 'web',
    os: device.osVersion,
  })
}

const startPosthog = async () => {
  const posthog = await getClient()
  if (!posthog) return null

  const { distinctId } = await resolveIdentity({
    deploymentType: state.deploymentType,
    userId: null,
  })
  state.distinctId = distinctId
  posthog.identify(distinctId)
  posthog.opt_in_capturing()
  await attachBaseProperties(posthog)
  return posthog
}

/**
 * Reads stored consent, resolves cloud/self-hosted, and starts PostHog only
 * if the *effective* analytics consent allows it. Safe to call multiple
 * times; only does real work once.
 */
export const initialize = async () => {
  if (state.initializing) return state.initializing
  state.initializing = (async () => {
    state.deploymentType = await resolveDeploymentType()

    const [storedAnalytics, storedCrash] = await Promise.all([
      getStoredConsent('analytics'),
      getStoredConsent('crash'),
    ])
    state.consent.analytics = storedAnalytics
    state.consent.crash = storedCrash

    const effectiveAnalytics = resolveEffectiveConsent(
      storedAnalytics,
      state.deploymentType,
    )

    if (isConfigured() && effectiveAnalytics === 'enabled') {
      await startPosthog()
    }

    state.initialized = true
  })()
  return state.initializing
}

/** Cloud only meaningfully identifies with the real user id; self-hosted
 * never sends anything derived from user identity. */
export const identify = async userId => {
  if (!state.initialized) await initialize()
  if (state.deploymentType !== 'cloud' || !userId) return

  const posthog = getClientSync()
  if (!posthog) return

  state.distinctId = String(userId)
  posthog.identify(state.distinctId)
}

/** Kept fresh from the app's own data layer (react-query), not re-fetched by
 * this module — see useAnalyticsIdentity. Refreshed as super-properties so
 * every subsequent event carries the latest cohort values without needing to
 * be passed at every call site. */
export const updateCommonProperties = ({
  circle_member_count,
  is_plus_account,
} = {}) => {
  if (typeof is_plus_account === 'boolean') {
    state.common.is_plus_account = is_plus_account
  }
  if (typeof circle_member_count === 'number') {
    state.common.circle_member_count = circle_member_count
  }

  const posthog = getClientSync()
  if (!posthog) return
  posthog.register({ ...state.common })
}

const canSend = kind =>
  state.initialized &&
  isConfigured() &&
  resolveEffectiveConsent(state.consent[kind], state.deploymentType) ===
    'enabled'

export const track = (eventName, properties = {}) => {
  if (!canSend('analytics')) return
  const posthog = getClientSync()
  if (!posthog) return

  const sanitized = sanitizeEventProperties(eventName, {
    ...state.common,
    ...properties,
  })
  if (!sanitized) return

  posthog.capture(eventName, sanitized)
}

export const captureError = (errorType, properties = {}) => {
  if (!canSend('crash')) return
  const posthog = getClientSync()
  if (!posthog) return

  const sanitized = sanitizeErrorProperties(errorType, properties)
  if (!sanitized) return

  posthog.capture(errorType, sanitized)
}

/**
 * kind: 'analytics' | 'crash'. Enabling analytics (re-)initializes PostHog
 * if needed and sends analytics_enabled; enabling crash-only never talks to
 * PostHog by itself (it only unlocks captureError once something reports).
 * Disabling never sends an event and clears identity/queued data.
 */
export const setConsent = async (kind, value, { source } = {}) => {
  if (!state.initialized) await initialize()

  state.consent[kind] = value
  await setStoredConsent(kind, value)

  if (value === 'disabled') {
    const posthog = getClientSync()
    if (posthog) {
      posthog.opt_out_capturing()
      posthog.reset()
    }
    if (kind === 'analytics' && state.consent.crash !== 'enabled') {
      await clearAnonymousIdentity()
    }
    return
  }

  // value === 'enabled'
  if (kind === 'analytics') {
    if (isConfigured()) {
      await startPosthog()
      track('analytics_enabled', { source: source || 'settings' })
    }
  } else if (kind === 'crash') {
    // Crash reporting alone doesn't need PostHog started with the analytics
    // super-properties path, but it does need a live client + identity to
    // send captureError() calls through.
    if (isConfigured() && !getClientSync()) {
      await startPosthog()
    }
  }
}

export const getConsent = kind =>
  resolveEffectiveConsent(state.consent[kind], state.deploymentType)

export const getRawConsent = kind => state.consent[kind]

export const getDeploymentType = () => state.deploymentType

export const shutdown = () => {
  const posthog = getClientSync()
  if (posthog) {
    posthog.opt_out_capturing()
    posthog.reset()
  }
  state.initialized = false
  state.initializing = null
}

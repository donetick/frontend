import { Preferences } from '@capacitor/preferences'

// Two independent consent axes, matching the existing onboarding UI
// (HeardAboutView's PrivacyPreferences): "analytics" gates track(), "crash"
// gates captureException(). A self-hosted user can opt into one without the
// other.
const CONSENT_KEYS = {
  analytics: 'analytics_consent',
  crash: 'analytics_crash_consent',
}

const ANON_ID_KEY = 'analytics_anon_id'
const INSTALLATION_ID_KEY = 'analytics_installation_id'

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for webviews without crypto.randomUUID — not cryptographically
  // strong, but this identifier carries no user information either way.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

const readPreference = async key => {
  try {
    const { value } = await Preferences.get({ key })
    return value ?? null
  } catch {
    return null
  }
}

const writePreference = async (key, value) => {
  try {
    await Preferences.set({ key, value })
  } catch {
    // best-effort; consent falls back to 'unknown' on next read
  }
}

const removePreference = async key => {
  try {
    await Preferences.remove({ key })
  } catch {
    // ignore
  }
}

export const getStoredConsent = async kind => {
  const value = await readPreference(CONSENT_KEYS[kind])
  return value === 'enabled' || value === 'disabled' ? value : 'unknown'
}

export const setStoredConsent = (kind, value) =>
  writePreference(CONSENT_KEYS[kind], value)

/**
 * Self-hosted `unknown` behaves as disabled (opt-in required); cloud
 * `unknown` behaves as enabled (opt-out available). Nothing is persisted by
 * this resolution alone — only an explicit setConsent() call writes a value.
 */
export const resolveEffectiveConsent = (stored, deploymentType) => {
  if (stored === 'enabled' || stored === 'disabled') return stored
  return deploymentType === 'cloud' ? 'enabled' : 'disabled'
}

export const getOrCreateAnonId = async () => {
  const existing = await readPreference(ANON_ID_KEY)
  if (existing) return existing
  const created = generateUUID()
  await writePreference(ANON_ID_KEY, created)
  return created
}

export const getOrCreateInstallationId = async () => {
  const existing = await readPreference(INSTALLATION_ID_KEY)
  if (existing) return existing
  const created = generateUUID()
  await writePreference(INSTALLATION_ID_KEY, created)
  return created
}

/**
 * Cloud + known user -> identify by the Donetick user id. Self-hosted (or
 * cloud pre-login) -> a random id containing no user information, never
 * derived from email/username/database id.
 */
export const resolveIdentity = async ({ deploymentType, userId }) => {
  if (deploymentType === 'cloud' && userId) {
    return { distinctId: String(userId), installationId: null }
  }
  const [anonId, installationId] = await Promise.all([
    getOrCreateAnonId(),
    deploymentType === 'cloud' ? null : getOrCreateInstallationId(),
  ])
  return { distinctId: anonId, installationId }
}

export const clearAnonymousIdentity = async () => {
  await Promise.all([
    removePreference(ANON_ID_KEY),
    removePreference(INSTALLATION_ID_KEY),
  ])
}

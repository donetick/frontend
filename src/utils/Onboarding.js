import { Capacitor } from '@capacitor/core'

// First-run onboarding is a native-app-only flow. On the web the user already
// chose to visit a URL, so we drop them straight on the auth screens.
const STORAGE_KEY = 'onboardingCompletedAt'

export const isNativeApp = () => {
  try {
    return Capacitor.isNativePlatform()
  } catch {
    return false
  }
}

export const hasSeenOnboarding = () => {
  try {
    return Boolean(localStorage.getItem(STORAGE_KEY))
  } catch {
    // Private-mode / storage-disabled webviews: never trap the user in a loop.
    return true
  }
}

export const markOnboardingSeen = () => {
  try {
    localStorage.setItem(STORAGE_KEY, new Date().toISOString())
  } catch {
    // ignore, worst case the flow is shown once more
  }
}

export const resetOnboarding = () => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}

const ACQUISITION_SOURCE_KEY = 'acquisitionSource'

/**
 * Stashes the "where'd you hear about us" answer locally for now. No
 * analytics pipeline is wired up yet — this is the single place that'll
 * change once there is one, so the survey screen itself never has to.
 */
export const recordAcquisitionSource = source => {
  try {
    localStorage.setItem(ACQUISITION_SOURCE_KEY, source)
  } catch {
    // ignore, this is best-effort telemetry
  }
}

const PRIVACY_PREFERENCES_KEY = 'privacyPreferences'

/**
 * Stashes the self-hosted privacy opt-ins locally, same stub-for-now
 * treatment as recordAcquisitionSource: no crash reporter or PostHog is wired
 * up yet, so this is just the one place that'll change once there is one.
 */
export const recordPrivacyPreferences = ({ crashReports, analytics }) => {
  try {
    localStorage.setItem(
      PRIVACY_PREFERENCES_KEY,
      JSON.stringify({ crashReports, analytics }),
    )
  } catch {
    // ignore, this is best-effort telemetry
  }
}

/**
 * Asks the OS for notification permission during onboarding and records the
 * answer under the same `notificationPreferences` key NotificationAccessSnackbar
 * reads, so a user who says yes here is never asked again after signing in.
 *
 * Only the permission is requested: registering the push token needs a session,
 * and there isn't one yet. The snackbar picks that up once the user is in.
 */
export const requestNotificationPermission = async () => {
  if (!isNativeApp()) return false
  try {
    const { LocalNotifications } = await import(
      '@capacitor/local-notifications'
    )
    const { Preferences } = await import('@capacitor/preferences')

    const result = await LocalNotifications.requestPermissions()
    const granted = result?.display === 'granted'

    await Preferences.set({
      key: 'notificationPreferences',
      value: JSON.stringify({ optOut: false, granted }),
    })
    return granted
  } catch {
    // Permission plugins are missing or the prompt was dismissed: carry on,
    // the in-app snackbar can still ask later.
    return false
  }
}

export const haptic = async (kind = 'light') => {
  if (!isNativeApp()) return
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
    await Haptics.impact({
      style: kind === 'medium' ? ImpactStyle.Medium : ImpactStyle.Light,
    })
  } catch {
    // no haptics on this platform
  }
}

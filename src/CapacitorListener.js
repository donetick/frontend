import { App as mobileApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import { focusManager } from '@tanstack/react-query'

import {
  receivePendingShare,
  storePendingShare,
} from './service/ShareTargetService'
import { getAppVersion, getStableDeviceId } from './utils/DeviceInfo'
import {
  RegisterDeviceToken,
  UnregisterDeviceToken,
  UpdateDeviceActivity,
} from './utils/Fetcher'
import { beginOAuthExchange } from './utils/OAuthExchangeState'
import { hasSeenOnboarding } from './utils/Onboarding'
import { setPendingInvite } from './utils/PendingInvite'
import statusBarManager from './utils/StatusBarManager'
import { hasValidAccessToken } from './utils/TokenStorage'

// React Router navigate(), injected by <App /> once the router is mounted.
// Using client-side navigation (instead of window.location.href) avoids a full
// document reload, which on a cold NFC launch re-boots the app from an
// unauthenticated state (iOS "server/connection" error) and re-triggers the
// sticky getLaunchUrl() (Android "back reloads the same page").
let navigateFn = null
const setNavigate = fn => {
  navigateFn = fn
}

// Navigate client-side when the router is available, otherwise fall back to a
// hard navigation (should only happen if a deep link arrives before mount).
const routerNavigate = (path, { seedHome = false } = {}) => {
  if (navigateFn) {
    // On a cold deep-link launch there is no real screen behind the target, so
    // seed the chore list as the back target before pushing the chore view.
    if (seedHome && ['/', '/home'].includes(window.location.pathname)) {
      navigateFn('/chores', { replace: true })
    }
    navigateFn(path)
  } else {
    window.location.href = path
  }
}

// Navigate to a chore from a deep link / notification tap. Shared by NFC,
// local and push notifications so they all get consistent cold-start handling.
const navigateToChore = (choreId, { autoComplete, isColdStart } = {}) => {
  if (choreId == null || choreId === '') return
  const path = `/chores/${choreId}${autoComplete ? '?auto_complete=' + autoComplete : ''}`

  // If we're already on the target page, skip (avoids redundant navigation).
  if (window.location.pathname + window.location.search === path) return

  console.log('[deeplink] navigating to', path)
  routerNavigate(path, { seedHome: isColdStart })
}

// NFC chore deep link: donetick://chores/123?auto_complete=true
const handleNFCChoreDeepLink = (url, isColdStart) => {
  try {
    const urlObj = new URL(url)
    // donetick://chores/123 → host='chores', pathname='/123'
    navigateToChore(urlObj.pathname.slice(1), {
      autoComplete: urlObj.searchParams.get('auto_complete'),
      isColdStart,
    })
  } catch (error) {
    console.error('[NFC] Error handling chore deep link:', error)
  }
}

const handleUrlOpen = (url, isColdStart = false) => {
  console.log('[NFC] handleUrlOpen:', url)
  let parsedUrl
  try {
    parsedUrl = new URL(url)
  } catch {
    return
  }

  const isCircleInvite =
    (parsedUrl.protocol === 'donetick:' &&
      parsedUrl.host === 'circle' &&
      parsedUrl.pathname === '/join') ||
    (parsedUrl.protocol === 'https:' && parsedUrl.pathname === '/circle/join')

  if (isCircleInvite) {
    setPendingInvite(parsedUrl.searchParams.get('code'))
    const needsOnboarding =
      !hasSeenOnboarding() && !localStorage.getItem('token')
    routerNavigate(
      needsOnboarding ? '/onboarding' : `/circle/join${parsedUrl.search}`,
    )
  } else if (url.startsWith('donetick://chores/add')) {
    // Widget "+" / quick-capture buttons: land on the chore list with the
    // quick-add modal open (MyChores watches for the add_task param and
    // consumes it). ?mode=scan|voice opens straight into that capture panel.
    let mode = null
    try {
      mode = new URL(url).searchParams.get('mode')
    } catch {
      // malformed URL — fall back to plain text capture
    }
    routerNavigate(
      mode === 'scan' || mode === 'voice'
        ? `/chores?add_task=1&mode=${mode}`
        : '/chores?add_task=1',
    )
  } else if (
    parsedUrl.protocol === 'donetick:' &&
    parsedUrl.host === 'chores' &&
    (parsedUrl.pathname === '' || parsedUrl.pathname === '/')
  ) {
    // Project/filter widget header: open the chore list with that saved view.
    const filterId = parsedUrl.searchParams.get('filterId')
    const projectId = parsedUrl.searchParams.get('project')
    routerNavigate(
      filterId
        ? `/chores?filterId=${encodeURIComponent(filterId)}`
        : projectId
          ? `/chores?project=${encodeURIComponent(projectId)}`
          : '/chores',
    )
  } else if (url.startsWith('donetick://chores/')) {
    handleNFCChoreDeepLink(url, isColdStart)
  } else if (
    parsedUrl.protocol === 'donetick:' &&
    parsedUrl.host === 'search'
  ) {
    routerNavigate('/search')
  } else if (
    parsedUrl.protocol === 'donetick:' &&
    parsedUrl.host === 'projects'
  ) {
    routerNavigate('/projects')
  } else if (
    parsedUrl.protocol === 'donetick:' &&
    parsedUrl.host === 'overview'
  ) {
    routerNavigate('/home')
  } else if (url.startsWith('donetick://auth/')) {
    handleOAuthDeepLink(url)
  }
}

// OAuth callback handler for deep links
const handleOAuthDeepLink = async url => {
  console.log('OAuth deep link received:', url)

  try {
    // Parse the URL to extract code and state
    const urlObj = new URL(url)
    const code = urlObj.searchParams.get('code')
    const state = urlObj.searchParams.get('state')
    const verifier = localStorage.getItem('authVerifier') ?? ''

    if (code && state) {
      // If we're already on the OAuth handler page with the same code, skip
      // re-navigating (a stale getLaunchUrl() replay would otherwise re-fire it).
      const currentCode = new URLSearchParams(window.location.search).get(
        'code',
      )
      if (window.location.pathname === '/auth/oauth2' && currentCode === code) {
        return
      }

      // Claim the exchange window synchronously, before the first await: the
      // resume-driven background sync fires in the same tick as this deep link,
      // and its 401 must not be mistaken for an expired session. Set after the
      // early return above so the flag is only ever claimed by the navigation
      // that Authenticating.jsx will clear.
      beginOAuthExchange()

      // Store the OAuth params for the app to pick up
      await Preferences.set({
        key: 'oauth_callback',
        value: JSON.stringify({ code, state, verifier, timestamp: Date.now() }),
      })

      // Close the browser if it's still open
      try {
        await Browser.close()
      } catch (e) {
        // Browser might already be closed
      }

      // Navigate to the OAuth handler page
      routerNavigate(
        `/auth/oauth2?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`,
      )
    }
  } catch (error) {
    console.error('Error handling OAuth deep link:', error)
  }
}

const localNotificationListenerRegistration = () => {
  LocalNotifications.addListener('localNotificationReceived', notification => {
    console.log('Notification received', notification)
  })
  LocalNotifications.addListener('localNotificationActionPerformed', event => {
    console.log('Notification action performed', event)
    if (event.actionId === 'tap') {
      console.log(
        'Notification opened, navigate to chore',
        event.notification.extra.choreId,
      )
      navigateToChore(event.notification.extra.choreId, { isColdStart: true })
    }
  })
}

// Set by registerPushNotifications({ force: true }) and consumed by the next
// `registration` event. Explicit user intent ("enable push", "register this
// device") must reach the server even when the locally cached registration
// still looks current — the row may have been removed server-side from
// another device's Settings screen.
let forceNextRegistration = false
let pushEnabled = false
let registrationEpoch = 0
let registrationQueue = Promise.resolve()
let pendingPushToken = null
let retryTimer = null

const schedulePushRetry = () => {
  if (retryTimer || !pushEnabled) return
  retryTimer = setTimeout(() => {
    retryTimer = null
    if (pushEnabled && hasValidAccessToken()) {
      void pushNotificationListenerRegistration()
    }
  }, 30000)
}

// The `registration` event fires on every PushNotifications.register() call,
// not just when the FCM token actually rotates, so compare against the last
// accepted registration and skip the round trip when nothing the server
// stores has changed.
const isRegistrationCurrent = async (token, deviceId, platform, appVersion) => {
  const stored = await Preferences.get({ key: 'deviceRegistration' })
  if (!stored.value) return false

  try {
    const previous = JSON.parse(stored.value)
    return (
      previous.token === token &&
      previous.deviceId === deviceId &&
      previous.platform === platform &&
      previous.appVersion === appVersion
    )
  } catch {
    // Corrupt record — treat as unregistered and re-register.
    return false
  }
}

// Refresh this device's last-seen timestamp. Returns false when the server
// says it has no active registration for this device (404), meaning the
// caller should register from scratch; returns true on success and on
// transient failures, where re-registering would be the wrong response.
const touchDeviceActivity = async deviceId => {
  try {
    const result = await UpdateDeviceActivity(deviceId)
    if (!result) {
      schedulePushRetry()
      return true
    }
    if (result.status === 404) return false
    if (!result.ok) {
      schedulePushRetry()
      console.warn('Device activity update failed:', result.status)
    }
    return true
  } catch (error) {
    schedulePushRetry()
    console.warn('Device activity update failed:', error)
    return true
  }
}

const registerTokenIfNeeded = async (
  token,
  deviceInfo,
  deviceId,
  platform,
  { epoch = registrationEpoch, force = false } = {},
) => {
  try {
    if (!pushEnabled || epoch !== registrationEpoch) return
    if (!deviceId) {
      console.warn('Skipping device registration: no device id available')
      return
    }

    // This runs from a native callback that can fire while no session exists
    // (onboarding, a cold start before tokens load, just after logout). The
    // resulting 401 would otherwise enter 401 recovery and force a logout.
    // `pushNotificationPreferences.granted` persists, so the next launch with
    // a live session re-registers.
    if (!hasValidAccessToken()) {
      schedulePushRetry()
      console.log('Skipping device registration: no valid session')
      return
    }

    if (
      !force &&
      (await isRegistrationCurrent(
        token.value,
        deviceId,
        platform,
        deviceInfo.appVersion,
      ))
    ) {
      // Nothing to re-send, but the server prunes registrations that stop
      // checking in, so still refresh last_active_at. A 404 means our cached
      // record is stale (row pruned, or removed from another device's
      // settings) — fall through to a full registration in that case.
      const stillRegistered = await touchDeviceActivity(deviceId)
      if (stillRegistered) {
        console.log('Device token unchanged, skipping registration')
        return
      }
      console.log('Cached device registration is stale, re-registering')
    }

    if (!pushEnabled || epoch !== registrationEpoch) return

    const result = await RegisterDeviceToken(
      token.value,
      deviceId,
      platform,
      deviceInfo.appVersion,
      deviceInfo.model,
    )

    if (!result) {
      schedulePushRetry()
      return
    }

    if (result.ok) {
      await Preferences.set({
        key: 'deviceRegistration',
        value: JSON.stringify({
          token: token.value,
          deviceId,
          platform,
          appVersion: deviceInfo.appVersion,
          registeredAt: Date.now(),
        }),
      })
      console.log('Device token registered successfully')
      window.dispatchEvent(new CustomEvent('deviceTokenRegistered'))
    } else {
      if (result.status !== 409) schedulePushRetry()
      console.error('Device registration failed:', result.status)
      // Drop the cached record so the next attempt is not deduped away by
      // isRegistrationCurrent() while the server has no row for this device.
      await Preferences.remove({ key: 'deviceRegistration' })
      window.dispatchEvent(
        new CustomEvent('deviceTokenRegistrationFailed', {
          detail: {
            status: result.status,
            error: await result.text().catch(() => 'Unknown error'),
          },
        }),
      )
    }
  } catch (error) {
    schedulePushRetry()
    console.error('Error registering device token:', error)
    window.dispatchEvent(
      new CustomEvent('deviceTokenRegistrationFailed', {
        detail: { status: 0, error: error?.message ?? 'Unknown error' },
      }),
    )
  }
}

// Drop this device from the account's push targets. Must run while the access
// token is still valid (i.e. before the logout cleanup clears it), otherwise
// the server keeps pushing this user's chores to a signed-out device.
const unregisterPushNotifications = async ({ disable = true } = {}) => {
  if (!Capacitor.isNativePlatform()) return true

  pushEnabled = false
  registrationEpoch += 1
  pendingPushToken = null
  forceNextRegistration = false
  clearTimeout(retryTimer)
  retryTimer = null
  if (disable) {
    await Preferences.set({
      key: 'pushNotificationPreferences',
      value: JSON.stringify({ granted: false }),
    })
  }

  // Finish any POST before DELETE, so a late registration cannot recreate the row.
  // Push requests bypass auth recovery to avoid a logout waiting on itself.
  await registrationQueue
  let removed = false
  try {
    const stored = await Preferences.get({ key: 'deviceRegistration' })
    const registration = stored.value ? JSON.parse(stored.value) : null
    const deviceId = registration?.deviceId ?? (await getStableDeviceId())
    const result = await UnregisterDeviceToken(deviceId, registration?.token)
    removed = Boolean(result?.ok || result?.status === 404)
    if (removed) await Preferences.remove({ key: 'deviceRegistration' })
    else console.error('Backend push unregistration failed:', result?.status)
  } catch (error) {
    console.error('Error unregistering device token', error)
  } finally {
    // Native cleanup must run even when the backend is unreachable.
    try {
      await PushNotifications.unregister()
    } catch (error) {
      console.error('Native push unregistration failed:', error)
    }
  }
  return removed
}

// Capacitor appends listeners rather than replacing them, and this function is
// called from several independent places (app launch, both Settings toggles,
// the onboarding snackbar). Without this guard each call added another full
// set, which double-POSTed the token and navigated once per duplicate on a
// single notification tap.
let pushListenersRegistered = false

const addPushListeners = () => {
  if (pushListenersRegistered) return
  pushListenersRegistered = true

  PushNotifications.addListener('registration', token => {
    if (!pushEnabled) return
    pendingPushToken = token
    const epoch = registrationEpoch
    const force = forceNextRegistration
    forceNextRegistration = false
    registrationQueue = registrationQueue
      .then(async () => {
        if (!pushEnabled || epoch !== registrationEpoch) return
        const deviceInfo = await Device.getInfo()
        deviceInfo.appVersion = await getAppVersion()
        const deviceId = await getStableDeviceId()
        await registerTokenIfNeeded(
          token,
          deviceInfo,
          deviceId,
          Capacitor.getPlatform(),
          {
            force,
            epoch,
          },
        )
      })
      .catch(error => {
        console.error('Error registering device token', error)
        schedulePushRetry()
      })
  })

  window.addEventListener('authTokensSaved', () => {
    if (pushEnabled && pendingPushToken && hasValidAccessToken()) {
      void pushNotificationListenerRegistration()
    }
  })
  window.addEventListener('online', () => {
    if (pushEnabled) void pushNotificationListenerRegistration()
  })

  PushNotifications.addListener('registrationError', error => {
    forceNextRegistration = false
    schedulePushRetry()
    console.error('Error on registration: ' + JSON.stringify(error))
  })

  PushNotifications.addListener('pushNotificationReceived', notification => {
    console.log('Push notification received: ', notification)
  })

  PushNotifications.addListener('pushNotificationActionPerformed', fcmEvent => {
    if (fcmEvent.actionId === 'tap') {
      if (
        fcmEvent.notification.data.type === 'chore_due' ||
        fcmEvent.notification.data.type === 'nudge'
      ) {
        navigateToChore(fcmEvent.notification.data.choreId, {
          isColdStart: true,
        })
      } else {
        routerNavigate('/chores')
      }
    }
  })
}

// `force` marks this as an explicit user action, so the token is re-sent to
// the server even if the locally cached registration still matches.
const pushNotificationListenerRegistration = async ({ force = false } = {}) => {
  if (!Capacitor.isNativePlatform()) return
  const epoch = registrationEpoch
  // Persist explicit opt-in before native callbacks can arrive.
  if (force) {
    await Preferences.set({
      key: 'pushNotificationPreferences',
      value: JSON.stringify({ granted: true }),
    })
  }
  const stored = await Preferences.get({ key: 'pushNotificationPreferences' })
  if (
    epoch !== registrationEpoch ||
    !stored.value ||
    !JSON.parse(stored.value).granted
  )
    return
  pushEnabled = true
  // Check and request permissions for Android 13+
  if (Capacitor.isNativePlatform()) {
    let permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') {
      pushEnabled = false
      clearTimeout(retryTimer)
      retryTimer = null
      // The opt-in above was written before the prompt was answered. Leaving
      // it behind made the Settings toggle — which initializes from this key
      // — read "on" while nothing was ever registered.
      if (force) {
        await Preferences.remove({ key: 'pushNotificationPreferences' })
      }
      console.warn('Push notification permission not granted')
      return
    }
  }

  // Attach before register() so the `registration` event it triggers cannot
  // land before anything is listening for it.
  if (epoch !== registrationEpoch || !pushEnabled) return
  addPushListeners()

  if (force) forceNextRegistration = true
  await PushNotifications.register()
}

let launchUrlHandled = false
let listenersRegistered = false

const registerCapacitorListeners = navigate => {
  if (navigate) setNavigate(navigate)

  if (!Capacitor.isNativePlatform()) {
    console.log(
      'Not a native platform, skipping registration of native listeners',
    )
    return
  }

  // registerCapacitorListeners runs from a React effect and may fire more than
  // once; only wire up the native listeners a single time.
  if (listenersRegistered) return
  listenersRegistered = true

  localNotificationListenerRegistration()

  // Android launches the plugin's share activity; iOS opens the app through
  // its URL scheme and emits sendIntentReceived. Check once for cold starts
  // and again for every warm share.
  const handleIncomingShare = share => {
    storePendingShare(share)
    routerNavigate('/chores?share_task=1')
  }
  const checkForShare = () => receivePendingShare(handleIncomingShare)
  window.addEventListener('sendIntentReceived', checkForShare)
  void checkForShare()

  // Cold-start: app was launched by tapping an NFC tag (or other deep link).
  // getLaunchUrl() is sticky and keeps returning the launch URL across reloads,
  // so consume it exactly once to avoid re-triggering navigation on every boot.
  mobileApp.getLaunchUrl().then(result => {
    if (result?.url && !launchUrlHandled) {
      launchUrlHandled = true
      console.log('[NFC] getLaunchUrl:', result.url)
      handleUrlOpen(result.url, true /* isColdStart */)
    }
  })

  // Foreground / singleTask resume: app was already running when the tag was tapped
  mobileApp.addListener('appUrlOpen', event => {
    console.log('[NFC] appUrlOpen:', event.url)
    handleUrlOpen(event.url, false /* isColdStart */)
  })

  mobileApp.addListener('appStateChange', ({ isActive }) => {
    focusManager.setFocused(isActive)
  })

  // On iOS, dismissing SFSafariViewController can leave the WebView laid out
  // underneath the status bar even though overlaysWebView is disabled.
  Browser.addListener('browserFinished', () => {
    void statusBarManager.restoreAfterNativeOverlayDismissal()
  })

  mobileApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else if (window.location.pathname !== '/') {
      // No history (e.g. app launched directly to a chore via NFC) — go home
      window.location.href = '/'
    } else {
      mobileApp.exitApp()
    }
  })
}

export {
  registerCapacitorListeners,
  pushNotificationListenerRegistration as registerPushNotifications,
  unregisterPushNotifications,
}

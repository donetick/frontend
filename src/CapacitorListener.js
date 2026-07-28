import { App as mobileApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import { focusManager } from '@tanstack/react-query'
import { RegisterDeviceToken } from './utils/Fetcher'

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
    if (seedHome && window.location.pathname === '/') {
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
  if (url.startsWith('donetick://chores/add')) {
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
  } else if (url.startsWith('donetick://chores/')) {
    handleNFCChoreDeepLink(url, isColdStart)
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

    if (code && state) {
      // If we're already on the OAuth handler page with the same code, skip
      // re-navigating (a stale getLaunchUrl() replay would otherwise re-fire it).
      const currentCode = new URLSearchParams(window.location.search).get(
        'code',
      )
      if (window.location.pathname === '/auth/oauth2' && currentCode === code) {
        return
      }

      // Store the OAuth params for the app to pick up
      await Preferences.set({
        key: 'oauth_callback',
        value: JSON.stringify({ code, state, timestamp: Date.now() }),
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

const registerTokenIfNeeded = async (token, deviceInfo, deviceId, platform) => {
  try {
    const result = await RegisterDeviceToken(
      token.value,
      deviceId.identifier,
      platform,
      deviceInfo.appVersion,
      deviceInfo.model,
    )

    if (!result) return

    if (result.ok) {
      await Preferences.set({
        key: 'deviceRegistration',
        value: JSON.stringify({
          token: token.value,
          deviceId: deviceId.identifier,
          platform,
          appVersion: deviceInfo.appVersion,
          registeredAt: Date.now(),
        }),
      })
      console.log('Device token registered successfully')
      window.dispatchEvent(new CustomEvent('deviceTokenRegistered'))
    } else {
      console.error('Device registration failed:', result.status)
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
    console.error('Error registering device token:', error)
    window.dispatchEvent(
      new CustomEvent('deviceTokenRegistrationFailed', {
        detail: { status: 0, error: error?.message ?? 'Unknown error' },
      }),
    )
  }
}

const pushNotificationListenerRegistration = async () => {
  // Check and request permissions for Android 13+
  if (Capacitor.isNativePlatform()) {
    let permStatus = await PushNotifications.checkPermissions()

    if (permStatus.receive === 'prompt') {
      permStatus = await PushNotifications.requestPermissions()
    }

    if (permStatus.receive !== 'granted') {
      console.warn('Push notification permission not granted')
      return
    }
  }

  await PushNotifications.register()

  PushNotifications.addListener('registration', async token => {
    if (Capacitor.isNativePlatform()) {
      try {
        const deviceInfo = await Device.getInfo()
        const deviceId = await Device.getId()

        const platform =
          Capacitor.getPlatform() === 'android' ? 'android' : 'ios'

        await registerTokenIfNeeded(token, deviceInfo, deviceId, platform)
      } catch (error) {
        console.error('Error registering device token', error)
      }
    }
  })

  PushNotifications.addListener('registrationError', error => {
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
}

import { App as mobileApp } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import { focusManager } from '@tanstack/react-query'
import { RegisterDeviceToken } from './utils/Fetcher'

// NFC chore deep link: donetick://chores/123?auto_complete=true
const handleNFCChoreDeepLink = url => {
  try {
    const urlObj = new URL(url)
    // donetick://chores/123 → host='chores', pathname='/123'
    const choreId = urlObj.pathname.slice(1)
    const autoComplete = urlObj.searchParams.get('auto_complete')
    const path = `/chores/${choreId}${autoComplete ? '?auto_complete=' + autoComplete : ''}`

    // getLaunchUrl() persists across every WebView reload caused by window.location.href.
    // If we're already on the target page, skip to avoid an infinite reload loop.
    if (window.location.pathname + window.location.search === path) return

    console.log('[NFC] navigating to', path)
    window.location.href = path
  } catch (error) {
    console.error('[NFC] Error handling chore deep link:', error)
  }
}

const handleUrlOpen = url => {
  console.log('[NFC] handleUrlOpen:', url)
  if (url.startsWith('donetick://chores/')) {
    handleNFCChoreDeepLink(url)
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
      // getLaunchUrl() persists across every WebView reload caused by
      // window.location.href. If we're already on the OAuth handler page with
      // the same code, skip re-navigating to avoid an infinite reload loop.
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
      window.location.href = `/auth/oauth2?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
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
      window.location.href = `/chores/${event.notification.extra.choreId}`
    }
  })
}

const registerTokenIfNeeded = async (token, deviceInfo, deviceId, platform) => {
  try {
    // const stored = await Preferences.get({ key: 'deviceRegistration' })
    // const lastReg = stored.value ? JSON.parse(stored.value) : null

    const current = {
      token: token.value,
      deviceId: deviceId.identifier,
      platform,
      appVersion: deviceInfo.appVersion,
      registeredAt: Date.now(),
    }

    // const shouldRegister =
    //   !lastReg ||
    //   lastReg.token !== current.token ||
    //   lastReg.appVersion !== current.appVersion ||
    //   Date.now() - lastReg.registeredAt > 7 * 24 * 60 * 60 * 1000

    // console.log('Registering device token:', {
    //   reason: !lastReg
    //     ? 'first_time'
    //     : lastReg.token !== current.token
    //       ? 'token_changed'
    //       : lastReg.appVersion !== current.appVersion
    //         ? 'app_updated'
    //         : 'periodic_refresh',
    // })

    const result = await RegisterDeviceToken(
      token.value,
      deviceId.identifier,
      platform,
      deviceInfo.appVersion,
      deviceInfo.model,
    )

    if (result && result.ok) {
      await Preferences.set({
        key: 'deviceRegistration',
        value: JSON.stringify(current),
      })
      console.log('Device token registered successfully')

      // Emit event to notify UI components of successful registration
      window.dispatchEvent(new CustomEvent('deviceTokenRegistered'))
    } else if (result) {
      // Handle registration errors
      console.error('Device registration failed:', result.status)

      // Emit event with error details for UI to handle
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
    console.error(
      'Error in token registration check, registering anyway:',
      error,
    )
    const fallbackResult = await RegisterDeviceToken(
      token.value,
      deviceId.identifier,
      platform,
      deviceInfo.appVersion,
      deviceInfo.model,
    )

    if (fallbackResult && fallbackResult.ok) {
      // Emit event to notify UI components of successful registration
      window.dispatchEvent(new CustomEvent('deviceTokenRegistered'))
    } else if (fallbackResult) {
      // Handle registration errors
      console.error(
        'Fallback device registration failed:',
        fallbackResult.status,
      )

      // Emit event with error details for UI to handle
      window.dispatchEvent(
        new CustomEvent('deviceTokenRegistrationFailed', {
          detail: {
            status: fallbackResult.status,
            error: await fallbackResult.text().catch(() => 'Unknown error'),
          },
        }),
      )
    }
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
        window.location.href = `/chores/${fcmEvent.notification.data.choreId}`
      } else {
        window.location.href = `/chores`
      }
    }
  })
}

const registerCapacitorListeners = () => {
  if (!Capacitor.isNativePlatform()) {
    console.log(
      'Not a native platform, skipping registration of native listeners',
    )
    return
  }
  localNotificationListenerRegistration()

  // Cold-start: app was launched by tapping an NFC tag (or other deep link)
  mobileApp.getLaunchUrl().then(result => {
    if (result?.url) {
      console.log('[NFC] getLaunchUrl:', result.url)
      handleUrlOpen(result.url)
    }
  })

  // Foreground / singleTask resume: app was already running when the tag was tapped
  mobileApp.addListener('appUrlOpen', event => {
    console.log('[NFC] appUrlOpen:', event.url)
    handleUrlOpen(event.url)
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
  pushNotificationListenerRegistration as registerPushNotifications
}


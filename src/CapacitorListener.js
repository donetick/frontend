import { App as mobileApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Preferences } from '@capacitor/preferences'
import { PushNotifications } from '@capacitor/push-notifications'
import { RegisterDeviceToken } from './utils/Fetcher'
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
    const stored = await Preferences.get({ key: 'deviceRegistration' })
    const lastReg = stored.value ? JSON.parse(stored.value) : null

    const current = {
      token: token.value,
      deviceId: deviceId.identifier,
      platform,
      appVersion: deviceInfo.appVersion,
      registeredAt: Date.now(),
    }

    const shouldRegister =
      !lastReg ||
      lastReg.token !== current.token ||
      lastReg.appVersion !== current.appVersion ||
      Date.now() - lastReg.registeredAt > 7 * 24 * 60 * 60 * 1000

    if (shouldRegister) {
      console.log('Registering device token:', {
        reason: !lastReg
          ? 'first_time'
          : lastReg.token !== current.token
            ? 'token_changed'
            : lastReg.appVersion !== current.appVersion
              ? 'app_updated'
              : 'periodic_refresh',
      })

      const result = await RegisterDeviceToken(
        token.value,
        deviceId.identifier,
        platform,
        deviceInfo.appVersion,
        deviceInfo.model,
      )

      if (result && !result.error) {
        await Preferences.set({
          key: 'deviceRegistration',
          value: JSON.stringify(current),
        })
        console.log('Device token registered successfully')
      }
    } else {
      console.log('Device token already registered, skipping')
    }
  } catch (error) {
    console.error(
      'Error in token registration check, registering anyway:',
      error,
    )
    await RegisterDeviceToken(
      token.value,
      deviceId.identifier,
      platform,
      deviceInfo.appVersion,
      deviceInfo.model,
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
  mobileApp.addListener('backButton', ({ canGoBack }) => {
    if (canGoBack) {
      window.history.back()
    } else {
      mobileApp.exitApp()
    }
  })
}

export {
  registerCapacitorListeners,
  pushNotificationListenerRegistration as registerPushNotifications,
}

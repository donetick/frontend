import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'
import { Preferences } from '@capacitor/preferences'

import { generateUUID } from './UUID'

const DEVICE_ID_FALLBACK_KEY = 'deviceIdFallback'

/**
 * Stable per-install device identifier, used as the primary key for this
 * device's push registration.
 *
 * Device.getId() returns Settings.Secure.ANDROID_ID on Android and
 * identifierForVendor on iOS. ANDROID_ID is null on some ROMs and inside some
 * work profiles, and identifierForVendor is null before the device is
 * unlocked for the first time; an empty deviceId is rejected by the server
 * (it is a required field), which surfaces as an opaque "registration
 * failed". Mint a UUID once and keep it in Preferences so those devices still
 * get a stable identity that survives relaunches.
 */
let deviceIdPromise = null
export const getStableDeviceId = () => {
  if (!deviceIdPromise) {
    deviceIdPromise = resolveDeviceId().catch(error => {
      deviceIdPromise = null
      throw error
    })
  }
  return deviceIdPromise
}

const resolveDeviceId = async () => {
  // Once a fallback is chosen, keep using it even if the OS ID becomes available.
  const stored = await Preferences.get({ key: DEVICE_ID_FALLBACK_KEY })
  if (stored.value) return stored.value
  let identifier = null
  try {
    identifier = (await Device.getId())?.identifier ?? null
  } catch (error) {
    console.warn('Device.getId() failed, using stored device id:', error)
  }

  if (typeof identifier === 'string' && identifier.trim() !== '') {
    return identifier.trim()
  }

  const generated = generateUUID()
  await Preferences.set({ key: DEVICE_ID_FALLBACK_KEY, value: generated })
  return generated
}

export const getAppVersion = async () => {
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

export const getDeviceContext = async () => {
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

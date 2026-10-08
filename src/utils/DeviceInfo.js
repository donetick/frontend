import { Capacitor } from '@capacitor/core'
import { Device } from '@capacitor/device'

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

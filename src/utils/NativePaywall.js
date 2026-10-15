import { Capacitor } from '@capacitor/core'

import { track } from '../analytics'

export const NATIVE_PAYWALL_INVOKER = {
  ONBOARDING: 'onboarding',
  ACCOUNT_SETTINGS: 'account_settings',
  SETTINGS: 'settings',
}

export const isNativePurchasePlatform = () =>
  Capacitor.isNativePlatform() &&
  (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android')

let configurationPromise = null

/** Configure RevenueCat once, or switch its identity when the signed-in user changes. */
const ensureRevenueCatConfigured = async appUserID => {
  if (!appUserID) throw new Error('A user ID is required to show the paywall')

  if (!configurationPromise) {
    configurationPromise = (async () => {
      const { Purchases } = await import('@revenuecat/purchases-capacitor')
      const platform = Capacitor.getPlatform()
      const apiKey =
        platform === 'ios'
          ? import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_IOS
          : import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_ANDROID

      if (!apiKey) {
        throw new Error(`RevenueCat is not configured for ${platform}`)
      }

      const { isConfigured } = await Purchases.isConfigured()
      if (!isConfigured) {
        await Purchases.configure({ apiKey, appUserID: String(appUserID) })
        return Purchases
      }

      const { appUserID: currentAppUserID } = await Purchases.getAppUserID()
      if (currentAppUserID !== String(appUserID)) {
        await Purchases.logIn({ appUserID: String(appUserID) })
      }

      return Purchases
    })()
  }

  try {
    return await configurationPromise
  } finally {
    configurationPromise = null
  }
}

/** Present RevenueCat on iOS/Android and report the outcome with its source. */
export const presentNativePaywall = async ({ appUserID, invoker }) => {
  if (!isNativePurchasePlatform()) return null

  const paywallInvoker = invoker ?? 'unknown'

  try {
    const Purchases = await ensureRevenueCatConfigured(appUserID)
    const { RevenueCatUI } = await import('@revenuecat/purchases-capacitor-ui')
    const { current: offering } = await Purchases.getOfferings()

    if (!offering) {
      track('paywall_result', {
        invoker: paywallInvoker,
        result: 'NOT_PRESENTED',
      })
      return 'NOT_PRESENTED'
    }

    const { result } = await RevenueCatUI.presentPaywall({
      offering,
      customVariables: { paywall_invoker: paywallInvoker },
    })
    track('paywall_result', { invoker: paywallInvoker, result })
    return result
  } catch (error) {
    track('paywall_result', { invoker: paywallInvoker, result: 'ERROR' })
    throw error
  }
}

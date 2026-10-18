import { Capacitor } from '@capacitor/core'

import { track } from '../analytics'
import statusBarManager from './StatusBarManager'

export const NATIVE_PAYWALL_INVOKER = {
  ONBOARDING: 'onboarding',
  ACCOUNT_SETTINGS: 'account_settings',
  SETTINGS: 'settings',
}

export const isNativePurchasePlatform = () =>
  Capacitor.isNativePlatform() &&
  (Capacitor.getPlatform() === 'ios' || Capacitor.getPlatform() === 'android')

let configurationPromise = null
let nativeModulesPromise = null

// Wrap the Capacitor proxies in a plain object. Returning a proxy itself from
// a promise makes JavaScript probe `proxy.then`, which Capacitor interprets as
// a native plugin call.
const loadNativePaywallModules = () => {
  if (!nativeModulesPromise) {
    nativeModulesPromise = Promise.all([
      import('@revenuecat/purchases-capacitor'),
      import('@revenuecat/purchases-capacitor-ui'),
    ])
      .then(([{ Purchases }, { RevenueCatUI }]) => ({
        Purchases,
        RevenueCatUI,
      }))
      .catch(error => {
        nativeModulesPromise = null
        throw error
      })
  }

  return nativeModulesPromise
}

/** Configure RevenueCat once, or switch its identity when the signed-in user changes. */
const ensureRevenueCatConfigured = async appUserID => {
  if (!appUserID) throw new Error('A user ID is required to show the paywall')

  if (!configurationPromise) {
    configurationPromise = (async () => {
      const { Purchases } = await loadNativePaywallModules()
      const platform = Capacitor.getPlatform()
      const apiKey =
        platform === 'ios'
          ? import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_IOS
          : import.meta.env.VITE_REACT_APP_REVENUECAT_API_KEY_ANDROID

      if (!apiKey) {
        throw new Error(`RevenueCat is not configured for ${platform}`)
      }

      const nextAppUserID = String(appUserID)
      const { isConfigured } = await Purchases.isConfigured()

      if (!isConfigured) {
        await Purchases.configure({ apiKey, appUserID: nextAppUserID })
        return
      }

      const { appUserID: currentAppUserID } = await Purchases.getAppUserID()
      if (currentAppUserID !== nextAppUserID) {
        await Purchases.logIn({ appUserID: nextAppUserID })
      }
    })()
  }

  const pendingConfiguration = configurationPromise
  try {
    await pendingConfiguration
  } finally {
    if (configurationPromise === pendingConfiguration) {
      configurationPromise = null
    }
  }
}

/** Warm the native SDK, UI module, and offering cache before the first click. */
export const prepareNativePaywall = async appUserID => {
  if (!isNativePurchasePlatform() || !appUserID) return

  await ensureRevenueCatConfigured(appUserID)
  const { Purchases } = await loadNativePaywallModules()
  await Purchases.getOfferings()
}

/** Present RevenueCat on iOS/Android and report the outcome with its source. */
export const presentNativePaywall = async ({ appUserID, invoker }) => {
  if (!isNativePurchasePlatform()) return null

  const paywallInvoker = invoker ?? 'unknown'
  track('paywall_shown', {
    provider: 'revenuecat',
    invoker: paywallInvoker,
  })

  try {
    // Never return a Capacitor plugin proxy from an async function. Promise
    // resolution probes returned values for `.then`; Capacitor interprets that
    // probe as a native `Purchases.then()` call and the flow stops before the
    // paywall is presented.
    await ensureRevenueCatConfigured(appUserID)
    const { Purchases, RevenueCatUI } = await loadNativePaywallModules()
    const { current: offering } = await Purchases.getOfferings()

    let result
    try {
      ;({ result } = await RevenueCatUI.presentPaywall({
        ...(offering ? { offering } : {}),
        customVariables: { paywall_invoker: paywallInvoker },
      }))
    } finally {
      // The paywall is a full-screen native view controller on iOS, so
      // dismissing it can leave the WebView laid out under the status bar —
      // same as SFSafariViewController. See
      // StatusBarManager.restoreAfterNativeOverlayDismissal.
      void statusBarManager.restoreAfterNativeOverlayDismissal()
    }
    track('paywall_result', { invoker: paywallInvoker, result })
    return result
  } catch (error) {
    track('paywall_result', { invoker: paywallInvoker, result: 'ERROR' })
    throw error
  }
}

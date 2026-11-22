// Keeps the Home Assistant sidebar URL in sync with the app's route.
//
// HA always loads the ingress root in its panel iframe and ignores the rest of its own URL,
// so without this a reload of the HA page sends the user back to the home page.
// HA's panel accepts two postMessage types from the iframe that fix this:
// - `home-assistant/navigate` updates HA's URL (we use replace, so HA's history isn't flooded).
// - `home-assistant/subscribe-properties` makes HA send `home-assistant/properties`,
//   whose `route.path` is the part of HA's URL after the panel prefix.
// Ingress is served from HA's origin, so messages are only exchanged with that origin.

import { appPathname, hasBasePath } from './BasePath'

const isHomeAssistantPanel = () => {
  if (typeof window === 'undefined' || !hasBasePath()) return false
  if (window.parent === window) return false
  try {
    // Throws if the parent is cross-origin, which means it isn't HA ingress.
    return window.parent.location.origin === window.location.origin
  } catch {
    return false
  }
}

// The router updates the browser URL before notifying subscribers, so window.location is current here.
// appPathname() removes the base path, which router.state.location still includes.
const currentAppPath = () =>
  `${appPathname()}${window.location.search}${window.location.hash}`

export const syncWithHomeAssistantPanel = router => {
  if (!isHomeAssistantPanel()) return

  const origin = window.location.origin
  // HA's panel prefix (e.g. "/a0d7b954_donetick"), known once HA has replied.
  let prefix = null

  const pushToHomeAssistant = () => {
    if (prefix === null) return
    const path = currentAppPath()
    window.parent.postMessage(
      {
        type: 'home-assistant/navigate',
        path: path === '/' ? prefix : `${prefix}${path}`,
        options: { replace: true },
      },
      origin,
    )
  }

  window.addEventListener('message', event => {
    if (event.source !== window.parent || event.origin !== origin) return
    const { route, type } = event.data || {}
    // Without a prefix we can't build HA's URL, so leave HA's URL alone.
    if (type !== 'home-assistant/properties' || !route?.prefix) return
    // HA resends properties whenever its route changes, including after our own navigate.
    // Only the first reply is used to restore the page.
    if (prefix !== null) return
    prefix = route.prefix

    // HA's route has no query string or hash, so take those from HA's URL directly.
    const { hash, search } = window.parent.location
    const target =
      route.path && route.path !== '/' ? `${route.path}${search}${hash}` : null
    if (target && target !== currentAppPath()) {
      router.navigate(target, { replace: true })
    } else {
      pushToHomeAssistant()
    }
  })

  router.subscribe(() => pushToHomeAssistant())

  window.parent.postMessage(
    { type: 'home-assistant/subscribe-properties' },
    origin,
  )
}

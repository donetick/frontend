// Isolates the posthog-js dependency so index.js never touches the SDK
// directly — keeps PostHog-specific config in one place and makes it
// possible to swap/mock the backend later without touching call sites.

let posthog = null

const KEY = import.meta.env.VITE_POSTHOG_KEY
const HOST = import.meta.env.VITE_POSTHOG_HOST

/** No-ops entirely without a key — covers self-hosted builds from source
 * that never configured one, and the current empty default. */
export const isConfigured = () => Boolean(KEY)

export const getClient = async () => {
  if (!isConfigured()) return null
  if (posthog) return posthog

  const module = await import('posthog-js')
  posthog = module.default

  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    capture_pageview: false,
    capture_pageleave: false,
    disable_session_recording: true,
    session_recording: { recorder: undefined },
    persistence: 'localStorage',
    opt_out_capturing_by_default: true,
  })

  return posthog
}

export const getClientSync = () => posthog

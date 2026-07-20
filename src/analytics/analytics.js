import { Capacitor } from '@capacitor/core'

import {
  POSTHOG_HOST,
  POSTHOG_HOST_NATIVE,
  POSTHOG_KEY,
  POSTHOG_UI_HOST,
} from '../Config'

/**
 * Centralized PostHog product-analytics wrapper.
 *
 * Design goals:
 * - **No-op by default.** When `VITE_POSTHOG_KEY` is unset (the case for every
 *   self-hoster who hasn't opted in) nothing loads, no network requests are
 *   made, and the posthog-js chunk is never even downloaded (it's behind a
 *   dynamic import).
 * - **Capacitor-safe.** In the native build the app is served from
 *   `capacitor://localhost` / `https://localhost`, where a same-origin reverse
 *   proxy path (e.g. `/ingest`) does not resolve. Native therefore requires an
 *   absolute ingestion host. See `resolveApiHost()`.
 * - **Privacy-first.** Person profiles only for identified users, DNT
 *   respected, and all session-recording inputs masked.
 *
 * Everything is guarded so callers never have to know whether analytics is
 * actually enabled.
 */

const isNative = Capacitor.isNativePlatform()

// The loaded posthog-js singleton, or null when analytics is disabled / not
// yet initialized. A single in-flight promise dedupes concurrent init calls.
let posthog = null
let initPromise = null

/**
 * Resolve the ingestion host (PostHog `api_host`).
 *
 * Web can use a same-origin reverse-proxy path (e.g. `/ingest`) to dodge
 * ad-blockers. Native cannot — it has no same-origin backend — so it needs an
 * absolute URL (a PostHog managed reverse proxy or the direct cloud host).
 */
function resolveApiHost() {
  const isAbsolute = value => /^https?:\/\//i.test(value || '')

  if (isNative) {
    // Prefer an explicit native host, then a web host that happens to be
    // absolute, then the direct cloud default.
    if (isAbsolute(POSTHOG_HOST_NATIVE)) return POSTHOG_HOST_NATIVE
    if (isAbsolute(POSTHOG_HOST)) return POSTHOG_HOST
    if ((POSTHOG_HOST_NATIVE || POSTHOG_HOST) && import.meta.env.DEV) {
      console.warn(
        '[analytics] Ignoring relative PostHog host on native (no same-origin ' +
          'backend). Set VITE_POSTHOG_HOST_NATIVE to an absolute URL.',
      )
    }
    return 'https://us.i.posthog.com'
  }

  return POSTHOG_HOST || 'https://us.i.posthog.com'
}

/**
 * Initialize PostHog. Safe to call multiple times — the underlying init runs
 * at most once. Resolves to the posthog instance, or `null` when disabled.
 */
export async function initAnalytics() {
  if (!POSTHOG_KEY) return null
  if (posthog) return posthog
  if (initPromise) return initPromise

  initPromise = (async () => {
    try {
      const { default: ph } = await import('posthog-js')
      ph.init(POSTHOG_KEY, {
        api_host: resolveApiHost(),
        // Points toolbar / session-replay links back at real PostHog when
        // api_host is a reverse proxy. Harmless when talking to the cloud host
        // directly.
        ui_host: POSTHOG_UI_HOST || 'https://us.posthog.com',
        // Opt into modern behaviors, incl. `capture_pageview: 'history_change'`
        // which captures SPA navigations via the History API (react-router v6
        // uses it) — no manual per-route $pageview wiring required.
        defaults: '2025-05-24',
        // Only create person profiles for identified users. Anonymous visitors
        // still send events but don't get a profile (cheaper + privacy-friendly).
        person_profiles: 'identified_only',
        capture_pageleave: true,
        // Cookies behave inconsistently on the capacitor:// origin inside a
        // webview; localStorage survives app relaunches more reliably there.
        persistence: isNative ? 'localStorage' : 'localStorage+cookie',
        // Honor the browser's Do Not Track signal.
        respect_dnt: true,
        // Session recording is heavier on mobile bandwidth/battery; off on
        // native. When enabled (web), mask every input so task content, names,
        // etc. never land in a recording.
        disable_session_recording: isNative,
        session_recording: {
          maskAllInputs: true,
        },
      })
      posthog = ph
      return ph
    } catch (e) {
      // Analytics must never break the app (e.g. blocked chunk, offline).
      console.error('[analytics] Failed to initialize PostHog', e)
      return null
    } finally {
      initPromise = null
    }
  })()

  return initPromise
}

/**
 * Associate subsequent events with a known user. Call on login / when the
 * authenticated profile becomes available. Ensures init has run first so the
 * first identify after login is never dropped.
 */
export async function identifyUser(user) {
  if (!POSTHOG_KEY || !user?.id) return
  const ph = await initAnalytics()
  if (!ph) return
  ph.identify(
    String(user.id),
    {
      // `$set` — refreshed on every identify.
      email: user.email,
      name: user.displayName || user.name,
      username: user.username,
    },
    {
      // `$set_once` — written only the first time we see this person.
      initial_timezone: user.timezone,
    },
  )
}

/**
 * Clear the current identity. Call on logout so the next user on this device
 * isn't merged into the previous account.
 */
export function resetAnalytics() {
  posthog?.reset()
}

/**
 * Capture a custom product event. No-op when analytics is disabled.
 */
export function captureEvent(event, properties) {
  posthog?.capture(event, properties)
}

/** Whether analytics is configured (key present). Useful for consent UI. */
export const isAnalyticsEnabled = Boolean(POSTHOG_KEY)

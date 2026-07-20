/* eslint-env node */
export const API_URL =
  import.meta.env.VITE_APP_API_URL === 'AUTO'
    ? `${window.location.hostname}/api`
    : import.meta.env.VITE_APP_API_URL
export const REDIRECT_URL = import.meta.env.VITE_APP_REDIRECT_URL //|| 'http://localhost:3000'
export const GOOGLE_CLIENT_ID = import.meta.env.VITE_APP_GOOGLE_CLIENT_ID
export const ENVIROMENT = import.meta.env.VITE_APP_ENVIROMENT

// PostHog product analytics. All optional — when VITE_POSTHOG_KEY is unset the
// analytics layer is a complete no-op (nothing loads, nothing is sent). See
// docs/analytics.md for setup and reverse-proxy guidance.
export const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY
// Ingestion host for the web build. Can be a same-origin reverse-proxy path
// (e.g. '/ingest'), a PostHog managed-proxy domain, or a direct cloud host.
export const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST
// Ingestion host for the Capacitor (native) build. Must be an ABSOLUTE URL —
// native has no same-origin backend, so a relative proxy path won't resolve.
export const POSTHOG_HOST_NATIVE = import.meta.env.VITE_POSTHOG_HOST_NATIVE
// UI host — used for toolbar / session-replay links when the ingestion host is
// a reverse proxy. Defaults to US cloud; set to https://eu.posthog.com for EU.
export const POSTHOG_UI_HOST = import.meta.env.VITE_POSTHOG_UI_HOST

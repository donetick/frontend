# Analytics (PostHog)

Donetick's frontend ships an **optional** [PostHog](https://posthog.com) product-analytics
integration. It is **disabled by default** and is a complete no-op unless you
explicitly provide a project key at build time.

- **Self-hosters:** do nothing and you get zero analytics — no scripts load, no
  network requests are made, and the PostHog library is not even included in the
  bundle (it's behind a build-time-eliminated dynamic import).
- **Donetick Cloud / opt-in deployments:** set a handful of `VITE_` env vars
  (below) to enable it.

The integration covers both the **web app** and the **Capacitor mobile app**
from the same codebase.

---

## 1. Quick start

1. Create a project in PostHog (Cloud US, Cloud EU, or self-hosted PostHog) and
   copy the **Project API Key** (starts with `phc_`).
2. Set the env vars for your build (see [§2](#2-environment-variables)):

   ```bash
   VITE_POSTHOG_KEY=phc_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   VITE_POSTHOG_HOST=https://us.i.posthog.com   # or your reverse proxy
   ```

3. Rebuild the frontend. Because Vite **inlines env vars at build time**, you
   must rebuild (not just restart) after changing them.

That's it for a basic setup. For production you should also configure a
[reverse proxy](#4-reverse-proxy-recommended-for-production) so ad-blockers
don't drop your events.

---

## 2. Environment variables

All variables are optional. Leaving `VITE_POSTHOG_KEY` unset disables analytics
entirely.

| Variable                   | Required | Applies to     | Description |
| -------------------------- | -------- | -------------- | ----------- |
| `VITE_POSTHOG_KEY`         | to enable | web + native  | PostHog **Project API Key** (`phc_...`). Absent ⇒ analytics fully disabled. |
| `VITE_POSTHOG_HOST`        | recommended | web         | Ingestion host for the **web** build. A same-origin reverse-proxy path (`/ingest`), a managed-proxy domain (`https://e.yourdomain.com`), or a direct cloud host (`https://us.i.posthog.com` / `https://eu.i.posthog.com`). Defaults to `https://us.i.posthog.com`. |
| `VITE_POSTHOG_HOST_NATIVE` | recommended for mobile | native | Ingestion host for the **Capacitor** build. **Must be an absolute URL** — see [§5](#5-capacitor--mobile). Falls back to `VITE_POSTHOG_HOST` if that is absolute, else the direct cloud host. |
| `VITE_POSTHOG_UI_HOST`     | only with a proxy | web + native | Where the toolbar / session-replay player links point. Set when the host above is a reverse proxy. Defaults to `https://us.posthog.com`; use `https://eu.posthog.com` for EU. |

These are wired through `src/Config.js` and consumed by `src/analytics/analytics.js`.

> **Key safety:** the PostHog *Project API Key* is a write-only, client-side
> token — it is designed to be shipped in the browser bundle and is **not** a
> secret. Do **not** put the *Personal API Key* here.

---

## 3. How it works

All analytics logic lives in **`src/analytics/analytics.js`**, a thin, no-op-safe
wrapper around `posthog-js`. Nothing else in the app talks to PostHog directly.

| Concern | Where | Notes |
| ------- | ----- | ----- |
| **Init** | `src/main.jsx` → `initAnalytics()` | Fired before render so the initial pageview and SPA history tracking start ASAP. No-op without a key. |
| **Pageviews** | automatic | We set `defaults: '2025-05-24'`, which enables `capture_pageview: 'history_change'`. PostHog hooks the History API, and since React Router v6 navigates via `history.pushState`, every route change is captured automatically — no per-route wiring. |
| **Identify** | `src/hooks/useAnalyticsIdentity.js`, mounted in `App.jsx` | Calls `posthog.identify()` when the authenticated profile loads (covers password login, OAuth, and refreshed sessions). |
| **Reset** | `src/utils/ApiClient.js` → `handleLogout()` | Calls `posthog.reset()` on logout so the next user on a shared device isn't merged into the previous account. |
| **Custom events** | `captureEvent(name, props)` from `src/analytics/analytics.js` | No-op when disabled. Use for product events you want to track. |

### Privacy-first defaults

The wrapper is configured conservatively:

- `person_profiles: 'identified_only'` — anonymous visitors don't get person
  profiles (cheaper, more private).
- `respect_dnt: true` — honors the browser "Do Not Track" signal.
- `session_recording.maskAllInputs: true` — if you enable session replay in the
  PostHog project, **all input values are masked** so task titles, names, notes,
  etc. never end up in a recording.
- `disable_session_recording` on native — replay is off in the mobile app to
  save bandwidth/battery.
- `persistence` is `localStorage` on native (cookies are unreliable on the
  `capacitor://` origin) and `localStorage+cookie` on web.

> Session replay, heatmaps, error tracking, and autocapture are **also gated by
> your PostHog project settings** — even with the SDK loaded, replay only records
> if you turn it on in the PostHog dashboard.

---

## 4. Reverse proxy (recommended for production)

Ad-blockers block requests to `*.posthog.com`, silently dropping a chunk of your
events. Routing PostHog traffic through **your own domain** avoids this and
typically recovers 10–30% of otherwise-blocked events. Two options.

### Option A — PostHog managed reverse proxy (easiest, recommended)

PostHog hosts the proxy for you; you just point a subdomain at it. **Free on all
PostHog Cloud plans**, and it produces an **absolute URL that works for both web
and mobile** — which is exactly what the Capacitor build needs.

1. In PostHog: **Organization settings → Proxy** (`/settings/organization-proxy`).
2. Choose a **subdomain** of a domain you own, e.g. `e.donetick.com`.
   - ⚠️ Avoid ad-blocker trigger words in the name: no `analytics`, `tracking`,
     `telemetry`, `posthog`, or even `ph`. Neutral names like `e.`, `data.`,
     `d.` work best.
3. Add the **CNAME** record PostHog gives you at your DNS provider.
4. Wait for status to go `waiting → issuing → live` (usually a few minutes).
5. Set:

   ```bash
   VITE_POSTHOG_HOST=https://e.donetick.com
   VITE_POSTHOG_HOST_NATIVE=https://e.donetick.com
   VITE_POSTHOG_UI_HOST=https://us.posthog.com   # or eu.posthog.com
   ```

> **Note:** the managed proxy routes through Cloudflare and is **not
> HIPAA-compliant** — don't send PHI through it.

### Option B — Self-hosted proxy

Proxy PostHog through a path/subdomain you control. Donetick's Go backend already
serves the frontend, so a same-origin `/ingest` path is the most ad-blocker-proof
setup **for the web app**. (Mobile still needs an absolute URL — see [§5](#5-capacitor--mobile).)

**Rules that apply to every self-hosted proxy:**

- Split traffic across two upstreams (US; swap `us`→`eu` for EU):
  - `/static/*` and `/array/*` → **`us-assets.i.posthog.com`** (JS bundles, recorder, surveys)
  - **everything else** → **`us.i.posthog.com`** (event capture, `/e`, `/i`, `/decide`, `/flags`, `/s`, recordings)
- **Rewrite the `Host` header** to the upstream domain, or you'll get `401`s.
- Allow **both GET and POST**.
- Allow large request bodies (**up to ~64 MB** for session-recording uploads).
- Use a **neutral path prefix** (`/ingest`, not `/analytics`) and **no trailing
  slash** on `api_host`.

#### Go backend (`net/http/httputil`)

Mount this at `/ingest/` in the Go backend that serves the SPA, then set
`VITE_POSTHOG_HOST=/ingest` for the web build.

```go
package analytics

import (
	"net/http"
	"net/http/httputil"
	"net/url"
	"strings"
)

const (
	phMain   = "us.i.posthog.com"        // ingestion, flags, recordings
	phAssets = "us-assets.i.posthog.com" // /static, /array
)

func newProxy(host string) *httputil.ReverseProxy {
	target := &url.URL{Scheme: "https", Host: host}
	p := httputil.NewSingleHostReverseProxy(target)
	orig := p.Director
	p.Director = func(r *http.Request) {
		orig(r)
		r.Host = host // rewrite Host header (avoids 401)
		r.URL.Host = host
		r.URL.Scheme = "https"
	}
	return p
}

// Handler proxies PostHog traffic. Mount at /ingest/ — StripPrefix removes the
// /ingest prefix so upstream sees /static/..., /e/..., /flags/..., /s/... intact.
func Handler() http.Handler {
	mainProxy := newProxy(phMain)
	assetProxy := newProxy(phAssets)
	return http.StripPrefix("/ingest", http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasPrefix(r.URL.Path, "/static/") || strings.HasPrefix(r.URL.Path, "/array/") {
			assetProxy.ServeHTTP(w, r)
		} else {
			mainProxy.ServeHTTP(w, r)
		}
	}))
}
```

If the backend uses gin/echo, mount the same handler under an `/ingest/*any`
route. This is a natural follow-up PR in the [backend repo](https://github.com/donetick/donetick).

#### Caddy

```caddy
e.donetick.com {
  handle /static/* {
    reverse_proxy https://us-assets.i.posthog.com:443 {
      header_up Host us-assets.i.posthog.com
      header_down -Access-Control-Allow-Origin
    }
  }
  handle /array/* {
    reverse_proxy https://us-assets.i.posthog.com:443 {
      header_up Host us-assets.i.posthog.com
      header_down -Access-Control-Allow-Origin
    }
  }
  handle {
    reverse_proxy https://us.i.posthog.com:443 {
      header_up Host us.i.posthog.com
      header_down -Access-Control-Allow-Origin
    }
  }
}
```

Then `VITE_POSTHOG_HOST=https://e.donetick.com`.

PostHog also documents [Cloudflare Workers](https://posthog.com/docs/advanced/proxy/cloudflare),
[nginx](https://posthog.com/docs/advanced/proxy), Vercel, and Netlify configs.

---

## 5. Capacitor / mobile

Donetick's mobile app is the same web SPA wrapped in a Capacitor WebView. A few
things differ from the browser:

- **The origin is not your domain.** Native loads the app from
  `capacitor://localhost` (iOS) / `https://localhost` (Android). There is **no
  same-origin backend**, so a **relative** `VITE_POSTHOG_HOST=/ingest` will not
  resolve on mobile.
  - ➡️ Set **`VITE_POSTHOG_HOST_NATIVE` to an absolute URL** (the managed proxy
    domain or a direct cloud host). The wrapper detects
    `Capacitor.isNativePlatform()` and picks the right host automatically; if the
    web host is relative and no native host is set, it safely falls back to the
    direct cloud host rather than sending events into the void.
- **Ad-blockers aren't a factor inside the WebView**, but using the same proxy
  domain for web and mobile keeps your data unified and reachability simple.
- **Session replay is disabled on native** by default (bandwidth/battery).
- **Autocapture URLs** will look like `capacitor://localhost/...`; rely on the
  route-based pageviews for navigation analysis.

We deliberately use **`posthog-js`** (not the React Native SDK) because this is a
WebView app, not a React Native app.

---

## 6. Disabling analytics

Leave `VITE_POSTHOG_KEY` empty (the default). With no key:

- `initAnalytics()` returns immediately.
- The dynamic `import('posthog-js')` is **eliminated by the bundler**, so the
  ~75 KB (gzip) PostHog library isn't shipped at all.
- `identify` / `reset` / `captureEvent` are all no-ops.

To turn it off for an existing deployment, unset the key and rebuild.

---

## 7. Consent / GDPR

The current setup respects Do-Not-Track and uses identified-only profiles, which
is a reasonable baseline. If your deployment needs **explicit opt-in consent**
(e.g. strict EU/GDPR), the cleanest approach is to **not call `initAnalytics()`
until the user consents**, or start suppressed with
`opt_out_capturing_by_default: true` and call `posthog.opt_in_capturing()` after
consent. The wrapper exposes `isAnalyticsEnabled` to help gate a consent banner.
This is intentionally left as a deployment-specific decision.

---

## References

- [PostHog React docs](https://posthog.com/docs/libraries/react)
- [PostHog JS config (all `init` options)](https://posthog.com/docs/libraries/js/config)
- [Reverse proxy overview](https://posthog.com/docs/advanced/proxy)
- [Managed reverse proxy](https://posthog.com/docs/advanced/proxy/managed-reverse-proxy)
- [Self-hosted proxy reference](https://posthog.com/docs/advanced/proxy/proxy-reference)
- [Identify users](https://posthog.com/docs/product-analytics/identify)

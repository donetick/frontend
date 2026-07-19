# Landing page migration

The marketing/landing page has moved **out of this app** into its own repository:

**➡️ https://github.com/majicmaj/donetick-landing**

This app (`frontend`) is now **app-only**. It renders the user's chores at the
root and no longer serves a marketing page on any hostname.

## Why

The landing page used to live inside this SPA and was shown by a hostname check
(`donetick.com` / `www.donetick.com` → `<Landing/>`, everything else → the app).
That meant every visitor to the marketing domain downloaded the entire app bundle
(~3 MB of JS) just to read a static pitch page, and the initial HTML was an empty
`<div id="root">` with no metadata — poor for both performance and SEO.

The landing page is now a separate **static Astro site** (`donetick-landing`):
server-rendered HTML with full meta/OpenGraph/JSON-LD, near-zero JS, and its own
independent deploy. One small React island (the fair-assignment demo) is the only
hydrated component.

## What changed in this repo

| Removed | Notes |
| --- | --- |
| `src/views/Landing/` (all components) | Hero, features, demos, footer, etc. now live in `donetick-landing`. |
| Hostname switch in `src/contexts/RouterContext.jsx` (`getMainRoute()`) | Root `/` now always renders `<MyChores/>`. |
| `/welcome` route | It pointed at `<Landing/>`; removed. |
| `aos` dependency | Only the landing page used it. |
| `VITE_IS_LANDING_DEFAULT` env var | Was unused in code; dropped from `.env` / `.env.development`. |

No app functionality changed. `/privacy` and `/terms` (their own views under
`src/views/PrivacyPolicy` and `src/views/Terms`) are untouched.

## Deployment / hosting impact

- **`app.donetick.com`** → keeps being served by this SPA. No change.
- **`donetick.com` / `www.donetick.com`** → must now be pointed at the new
  **`donetick-landing`** deployment (a static site; deploy to Cloudflare Pages or
  any static host — build `npm run build`, output `dist/`). Until you repoint it,
  `donetick.com` served by this app will simply show the app (which sends
  signed-out visitors to `/login`) instead of the marketing page.
- **Self-hosters:** no action needed. Self-hosted instances never showed the
  marketing landing (the hostname check only matched the public domains), so the
  root already rendered the app for them. They can ignore the landing site
  entirely.

## For contributors working on the marketing page

Open a PR against **https://github.com/majicmaj/donetick-landing**, not this repo.
Content there was ported from the old `src/views/Landing/` components.

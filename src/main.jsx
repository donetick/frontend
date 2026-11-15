import './i18n/config'
import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import StartupScreen from './components/StartupScreen.jsx'

const marketingHosts = new Set(['donetick.com', 'www.donetick.com'])
// ?site=marketing works in every build, not just dev, so preview deploys on
// *.pages.dev can exercise the marketing bundle. Landing on the app host with
// the flag set just renders the marketing pages — nothing sensitive is gated
// on this.
const isMarketingSite =
  marketingHosts.has(window.location.hostname) ||
  new URLSearchParams(window.location.search).get('site') === 'marketing'

export const Site = React.lazy(async () => {
  if (isMarketingSite) return import('./MarketingApp.jsx')

  // Download/evaluate the app and restore local state in parallel. Keep the
  // existing bootstrap screen until essentials are ready, then reveal the
  // app directly with data instead of mounting Home into another spinner.
  // Wait at most 1.5s for essential cache reads, never for API requests or
  // optional metadata. A slow database must not hold the app shell forever.
  const [application] = await Promise.all([
    import('./Application.jsx'),
    import('./utils/AuthSession.js').then(({ restoreSession }) =>
      restoreSession(),
    ),
  ])
  return application
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={<StartupScreen />}>
      <Site />
    </React.Suspense>
  </React.StrictMode>,
)

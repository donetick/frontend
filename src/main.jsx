import './i18n/config'
import './index.css'

import { SplashScreen } from '@capacitor/splash-screen'
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

export const Site = React.lazy(() =>
  isMarketingSite ? import('./MarketingApp.jsx') : import('./Application.jsx'),
)

// index.html already asked the native launch screen to hide; this covers the
// case where its inline script couldn't reach the plugin. Hiding is idempotent.
SplashScreen.hide({ fadeOutDuration: 200 }).catch(() => {})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={<StartupScreen />}>
      <Site />
    </React.Suspense>
  </React.StrictMode>,
)

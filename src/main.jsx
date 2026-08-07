import './i18n/config'
import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

const marketingHosts = new Set(['donetick.com', 'www.donetick.com'])
const isMarketingSite =
  marketingHosts.has(window.location.hostname) ||
  (import.meta.env.DEV &&
    new URLSearchParams(window.location.search).get('site') === 'marketing')

export const Site = React.lazy(() =>
  isMarketingSite ? import('./MarketingApp.jsx') : import('./Application.jsx'),
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <React.Suspense fallback={null}>
      <Site />
    </React.Suspense>
  </React.StrictMode>,
)

import React from 'react'
import ReactDOM from 'react-dom/client'
import { initAnalytics } from './analytics/analytics'
import App from './App.jsx'
import Contexts from './contexts/Contexts.jsx'
import './i18n/config'
import './index.css'

// Fire-and-forget: no-op unless VITE_POSTHOG_KEY is set. Kicked off before
// render so the initial pageview and SPA history tracking start ASAP.
initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Contexts>
      <App />
    </Contexts>
  </React.StrictMode>,
)

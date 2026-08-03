import './i18n/config'
import './index.css'

import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App.jsx'
import Contexts from './contexts/Contexts.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Contexts>
      <App />
    </Contexts>
  </React.StrictMode>,
)

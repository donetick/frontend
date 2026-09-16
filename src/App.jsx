import './styles/safe-area.css'

import { Button, Typography, useColorScheme } from '@mui/joy'
import { useCallback, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'

import NavBar from '@/views/components/NavBar'

import {
  initialize as initializeAnalytics,
  installGlobalErrorHandlers,
} from './analytics'
import useAnalyticsIdentity from './analytics/useAnalyticsIdentity'
import { registerCapacitorListeners } from './CapacitorListener'
import PageTransition from './components/animations/PageTransition'
import { ImpersonateUserProvider } from './contexts/ImpersonateUserContext'
import { KeyboardShortcutScopeProvider } from './contexts/KeyboardShortcutScopeContext'
import SSEProvider from './contexts/SSEContext'
import { AuthProvider } from './hooks/useAuth.jsx'
import useOnboardingGate from './hooks/useOnboardingGate'
import useStatusBar from './hooks/useStatusBar'
import { useSyncOnReconnect } from './hooks/useSyncOnReconnect'
import { useResource } from './queries/ResourceQueries'
import { GlobalSearchProvider } from './search/GlobalSearchContext'
import { recordRoute } from './service/DiagnosticsSession'
import { useNotification } from './service/NotificationProvider'
import NetworkBanner from './views/components/NetworkBanner'

const add = className => {
  document.getElementById('root').classList.add(className)
}

const remove = className => {
  document.getElementById('root').classList.remove(className)
}

// TODO: Update the interval to at 60 minutes
const intervalMS = 5 * 60 * 1000 // 5 minutes

const AppContent = () => {
  const { t } = useTranslation()
  const { showNotification } = useNotification()
  const location = useLocation()
  useSyncOnReconnect()
  useAnalyticsIdentity()

  // Every route renders through this Outlet, so one listener here gives crash
  // reports the trail that led to the failure.
  useEffect(() => {
    recordRoute(location.pathname)
  }, [location.pathname])

  // First-launch native users see the onboarding flow before anything else.
  const isRedirectingToOnboarding = useOnboardingGate()

  // Initialize status bar with theme-aware configuration
  useStatusBar()

  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
      r &&
        setInterval(() => {
          r.update()
        }, intervalMS)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  useEffect(() => {
    if (needRefresh) {
      showNotification({
        type: 'custom',
        component: (
          <div>
            <Typography level='body-md'>{t('newVersionAvailable')}</Typography>
            <Button
              color='secondary'
              size='small'
              onClick={() => {
                updateServiceWorker(true)
                setNeedRefresh(false)
              }}
              sx={{ ml: 2 }}
            >
              {t('refresh')}
            </Button>
          </div>
        ),
        snackbarProps: {
          autoHideDuration: null, // Persistent until user action
        },
      })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needRefresh])

  if (isRedirectingToOnboarding) return null

  return (
    <div>
      <ImpersonateUserProvider>
        <NavBar />
        <PageTransition>
          <Outlet />
        </PageTransition>
      </ImpersonateUserProvider>
    </div>
  )
}

function App() {
  const resource = useResource()
  const { mode, systemMode } = useColorScheme()
  const navigate = useNavigate()

  // startOpenReplay()

  const setThemeClass = useCallback(() => {
    const value = JSON.parse(localStorage.getItem('themeMode')) || mode

    if (value === 'system') {
      if (systemMode === 'dark') {
        return add('dark')
      }
      return remove('dark')
    }

    if (value === 'dark') {
      return add('dark')
    }

    return remove('dark')
  }, [mode, systemMode])

  useEffect(() => {
    setThemeClass()
  }, [setThemeClass])

  useEffect(() => {
    registerCapacitorListeners(navigate)
  }, [navigate])

  useEffect(() => {
    initializeAnalytics()
    installGlobalErrorHandlers()
  }, [])

  return (
    <div>
      <NetworkBanner />

      <AuthProvider>
        <SSEProvider>
          <GlobalSearchProvider>
            <KeyboardShortcutScopeProvider>
              <AppContent />
            </KeyboardShortcutScopeProvider>
          </GlobalSearchProvider>
        </SSEProvider>
      </AuthProvider>
    </div>
  )
}

export default App

import NavBar from '@/views/components/NavBar'
import { Button, Typography, useColorScheme } from '@mui/joy'
import { useCallback, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { registerCapacitorListeners } from './CapacitorListener'
import PageTransition from './components/animations/PageTransition'
import { ImpersonateUserProvider } from './contexts/ImpersonateUserContext'
import { AuthProvider } from './hooks/useAuth.jsx'

import useStatusBar from './hooks/useStatusBar'
import { useResource } from './queries/ResourceQueries'
import './styles/safe-area.css'

import SSEProvider from './contexts/SSEContext'
import { useNotification } from './service/NotificationProvider'

import { useSyncOnReconnect } from './hooks/useSyncOnReconnect'
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
  const { showNotification } = useNotification()
  useSyncOnReconnect()

  // Initialize status bar with theme-aware configuration
  useStatusBar()


  const {
    offlineReady: [offlineReady, setOfflineReady], // eslint-disable-line no-unused-vars
    needRefresh: [needRefresh, setNeedRefresh],
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
            <Typography level='body-md'>
              A new version is now available. Click on reload button to update.
            </Typography>
            <Button
              color='secondary'
              size='small'
              onClick={() => {
                updateServiceWorker(true)
                setNeedRefresh(false)
              }}
              sx={{ ml: 2 }}
            >
              Refresh
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
  const resource = useResource() // eslint-disable-line no-unused-vars
  const { mode, systemMode } = useColorScheme()

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
    registerCapacitorListeners()
  }, [])

  return (
    <div>
      <NetworkBanner />

      <AuthProvider>
        <SSEProvider>
          <AppContent />
        </SSEProvider>
      </AuthProvider>
    </div>
  )
}

export default App

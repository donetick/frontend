import NavBar from '@/views/components/NavBar'
import { Button, Typography, useColorScheme } from '@mui/joy'
import Tracker from '@openreplay/tracker'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { registerCapacitorListeners } from './CapacitorListener'
import { ImpersonateUserProvider } from './contexts/ImpersonateUserContext'
import { useResource } from './queries/ResourceQueries'
import { AuthenticationProvider } from './service/AuthenticationService'
import {
  NotificationProvider,
  useNotification,
} from './service/NotificationProvider'
import { apiManager } from './utils/TokenManager'
import NetworkBanner from './views/components/NetworkBanner'
const add = className => {
  document.getElementById('root').classList.add(className)
}

const remove = className => {
  document.getElementById('root').classList.remove(className)
}
// TODO: Update the interval to at 60 minutes
const intervalMS = 5 * 60 * 1000 // 5 minutes
const queryClient = new QueryClient({})

const AppContent = () => {
  const { showNotification } = useNotification()

  const {
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
  }, [needRefresh, showNotification, updateServiceWorker, setNeedRefresh])

  return (
    <>
      <ImpersonateUserProvider>
        <NavBar />
        <Outlet />
      </ImpersonateUserProvider>
    </>
  )
}

function App() {
  const resource = useResource()
  const navigate = useNavigate()
  startApiManager(navigate)
  startOpenReplay()

  const { mode, systemMode } = useColorScheme()

  const setThemeClass = () => {
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
  }

  useEffect(() => {
    setThemeClass()
  }, [mode, systemMode])

  useEffect(() => {
    registerCapacitorListeners()
  }, [])

  return (
    <div className='min-h-screen'>
      <NetworkBanner />

      <QueryClientProvider client={queryClient}>
        <AuthenticationProvider />
        <NotificationProvider>
          <AppContent />
        </NotificationProvider>
      </QueryClientProvider>
    </div>
  )
}

const startOpenReplay = () => {
  if (!import.meta.env.VITE_OPENREPLAY_PROJECT_KEY) return
  const tracker = new Tracker({
    projectKey: import.meta.env.VITE_OPENREPLAY_PROJECT_KEY,
  })

  tracker.start()
}
export default App

const startApiManager = navigate => {
  apiManager.init()
  apiManager.setNavigateToLogin(() => {
    navigate('/login')
  })
}

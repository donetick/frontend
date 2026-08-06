import { useColorScheme } from '@mui/joy'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

import { ImpersonateUserProvider } from './contexts/ImpersonateUserContext'
import { LocalizationProvider } from './contexts/LocalizationContext'
import ThemeContext from './contexts/ThemeContext'
import Landing from './views/Landing/Landing'
import PrivacyPolicyView from './views/PrivacyPolicy/PrivacyPolicyView'
import TermsView from './views/Terms/TermsView'

const AppRedirect = () => {
  useEffect(() => {
    const { hash, pathname, search } = window.location
    window.location.replace(
      `https://app.donetick.com${pathname}${search}${hash}`,
    )
  }, [])

  return null
}

const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/privacy', element: <PrivacyPolicyView /> },
  { path: '/terms', element: <TermsView /> },
  { path: '*', element: <AppRedirect /> },
])

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { enabled: false, refetchOnWindowFocus: false, retry: false },
  },
})

const ThemeClass = () => {
  const { mode, systemMode } = useColorScheme()

  useEffect(() => {
    const storedMode = JSON.parse(localStorage.getItem('themeMode') || 'null')
    const selectedMode = storedMode || mode
    const isDark =
      selectedMode === 'dark' ||
      (selectedMode === 'system' && systemMode === 'dark')

    document.getElementById('root').classList.toggle('dark', isDark)
  }, [mode, systemMode])

  return null
}

const MarketingApp = () => (
  <ThemeContext>
    <ThemeClass />
    <QueryClientProvider client={queryClient}>
      <LocalizationProvider>
        <ImpersonateUserProvider>
          <RouterProvider router={router} />
        </ImpersonateUserProvider>
      </LocalizationProvider>
    </QueryClientProvider>
  </ThemeContext>
)

export default MarketingApp

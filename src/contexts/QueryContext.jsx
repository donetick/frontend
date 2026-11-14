import { QueryClientProvider } from '@tanstack/react-query'
import { useEffect } from 'react'

import { queryClient } from '../queries/QueryClient'
import { initWidgetSync } from '../service/WidgetService'

const QueryContext = ({ children }) => {
  // main.jsx prepares this same client before mounting the application.
  // AuthSession owns restoration on startup/login and cleanup on logout.
  useEffect(() => initWidgetSync(queryClient), [])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default QueryContext

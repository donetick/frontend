import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { initWidgetSync } from '../service/WidgetService'

const QueryContext = ({ children }) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 300000, // 5 minutes
            gcTime: 600000, // 10 minutes
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  )

  useEffect(() => initWidgetSync(queryClient), [queryClient])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default QueryContext

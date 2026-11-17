import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'

import { hydrateQueriesFromOfflineCache } from '../queries/OfflineHydration'
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

  // Fill the cache from IndexedDB/SQLite as early as possible so the first
  // screen renders from cached data while the real requests are still in
  // flight. Deliberately not awaited: a slow IDB open must not delay the app,
  // and seeding a query that is already fetching still flips it out of its
  // loading state (the network result overwrites it when it arrives).
  useEffect(() => {
    hydrateQueriesFromOfflineCache(queryClient)
  }, [queryClient])

  useEffect(() => initWidgetSync(queryClient), [queryClient])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default QueryContext

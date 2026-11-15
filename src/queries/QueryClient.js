import { QueryClient } from '@tanstack/react-query'

// Shared by the bootstrap and provider: preparing a different client would
// still leave every screen empty on its first render.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 300000,
      gcTime: 600000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})

// Keep essential snapshots for this session, even while their screens are
// unmounted. Freshness still uses staleTime and background revalidation.
queryClient.setQueryDefaults(['chores'], { gcTime: Infinity })
queryClient.setQueryDefaults(['userProfile'], { gcTime: Infinity })

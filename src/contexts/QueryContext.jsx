import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const QueryContext = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60000, // 60 seconds
        gcTime: 300000, // 5 minutes
        refetchOnWindowFocus: false,
        retry: 0,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default QueryContext

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const QueryContext = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 300000, // 5 minutes
        gcTime: 600000, // 10 minutes
        refetchOnWindowFocus: false,
        retry: 1,
      },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

export default QueryContext
